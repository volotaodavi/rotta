import { BadRequestException, ConflictException, NotFoundException } from "@nestjs/common";

import { LegalDocumentsService } from "../legal-documents.service";

import type { LegalDocumentRepository } from "../repositories/legal-document.repository";
import type { AuthenticatedUser } from "@/common/decorators/current-user.decorator";
import type { LegalDocument, LegalDocumentVersion } from "@prisma/client";

import { Role } from "@/shared/enums";

function buildDocument(overrides: Partial<LegalDocument> = {}): LegalDocument {
  return {
    id: "doc-1",
    slug: "termos",
    titulo: "Termos de Uso",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function buildVersion(overrides: Partial<LegalDocumentVersion> = {}): LegalDocumentVersion {
  return {
    id: "version-1",
    documentId: "doc-1",
    versao: 1,
    conteudoMarkdown: "# Termos",
    changelog: null,
    status: "RASCUNHO",
    autorId: "user-autor",
    aprovadoPorId: null,
    publicadoEm: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function buildActor(overrides: Partial<AuthenticatedUser> = {}): AuthenticatedUser {
  return {
    sub: "user-aprovador",
    tenantId: null,
    role: Role.ADMIN_ROTTA,
    vinculoId: "v1",
    ...overrides,
  };
}

describe("LegalDocumentsService", () => {
  let repository: jest.Mocked<LegalDocumentRepository>;
  let service: LegalDocumentsService;

  beforeEach(() => {
    repository = {
      createDocument: jest.fn(),
      findDocumentById: jest.fn(),
      findDocumentBySlug: jest.fn(),
      listDocuments: jest.fn(),
      createVersion: jest.fn(),
      findVersionById: jest.fn(),
      findLatestVersionNumber: jest.fn(),
      updateVersion: jest.fn(),
    };
    service = new LegalDocumentsService(repository);
  });

  describe("createVersion", () => {
    it("usa o próximo número sequencial (maior versao + 1)", async () => {
      repository.findDocumentById.mockResolvedValue({ ...buildDocument(), versoes: [] });
      repository.findLatestVersionNumber.mockResolvedValue(3);
      repository.createVersion.mockResolvedValue(buildVersion({ versao: 4 }));

      await service.createVersion("doc-1", { conteudoMarkdown: "novo texto" }, buildActor());

      expect(repository.createVersion).toHaveBeenCalledWith(
        expect.objectContaining({ documentId: "doc-1", versao: 4, autorId: "user-aprovador" }),
      );
    });

    it("lança NotFoundException quando o documento não existe", async () => {
      repository.findDocumentById.mockResolvedValue(null);

      await expect(
        service.createVersion("doc-inexistente", { conteudoMarkdown: "x" }, buildActor()),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("submitForReview (RASCUNHO -> REVISAO)", () => {
    it("recusa sem changelog preenchido", async () => {
      repository.findVersionById.mockResolvedValue(
        buildVersion({ status: "RASCUNHO", changelog: null }),
      );

      await expect(service.submitForReview("doc-1", "version-1")).rejects.toThrow(
        BadRequestException,
      );
    });

    it("recusa quando a versão não está em RASCUNHO", async () => {
      repository.findVersionById.mockResolvedValue(
        buildVersion({ status: "REVISAO", changelog: "ajuste" }),
      );

      await expect(service.submitForReview("doc-1", "version-1")).rejects.toThrow(
        ConflictException,
      );
    });

    it("move para REVISAO com changelog preenchido", async () => {
      repository.findVersionById.mockResolvedValue(
        buildVersion({ status: "RASCUNHO", changelog: "ajuste pós achado C1" }),
      );
      repository.updateVersion.mockResolvedValue(buildVersion({ status: "REVISAO" }));

      await service.submitForReview("doc-1", "version-1");

      expect(repository.updateVersion).toHaveBeenCalledWith("version-1", { status: "REVISAO" });
    });
  });

  describe("approve (REVISAO -> APROVACAO) — regra dos quatro-olhos", () => {
    it("recusa quando o aprovador é o mesmo autor da versão", async () => {
      repository.findVersionById.mockResolvedValue(
        buildVersion({ status: "REVISAO", autorId: "user-aprovador" }),
      );

      await expect(
        service.approve("doc-1", "version-1", buildActor({ sub: "user-aprovador" })),
      ).rejects.toThrow(ConflictException);
      expect(repository.updateVersion).not.toHaveBeenCalled();
    });

    it("aprova quando o ator é diferente do autor", async () => {
      repository.findVersionById.mockResolvedValue(
        buildVersion({ status: "REVISAO", autorId: "user-autor" }),
      );
      repository.updateVersion.mockResolvedValue(buildVersion({ status: "APROVACAO" }));

      await service.approve("doc-1", "version-1", buildActor({ sub: "user-aprovador" }));

      expect(repository.updateVersion).toHaveBeenCalledWith("version-1", {
        status: "APROVACAO",
        aprovadoPorId: "user-aprovador",
      });
    });

    it("recusa quando a versão não está em REVISAO", async () => {
      repository.findVersionById.mockResolvedValue(buildVersion({ status: "RASCUNHO" }));

      await expect(service.approve("doc-1", "version-1", buildActor())).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe("publish (APROVACAO -> PUBLICADO)", () => {
    it("recusa quando a versão não está em APROVACAO", async () => {
      repository.findVersionById.mockResolvedValue(buildVersion({ status: "REVISAO" }));

      await expect(service.publish("doc-1", "version-1")).rejects.toThrow(ConflictException);
    });

    it("publica e grava publicadoEm", async () => {
      repository.findVersionById.mockResolvedValue(buildVersion({ status: "APROVACAO" }));
      repository.updateVersion.mockResolvedValue(buildVersion({ status: "PUBLICADO" }));

      await service.publish("doc-1", "version-1");

      expect(repository.updateVersion).toHaveBeenCalledWith(
        "version-1",
        expect.objectContaining({ status: "PUBLICADO", publicadoEm: expect.any(Date) }),
      );
    });
  });

  describe("updateVersion", () => {
    it("recusa editar conteúdo fora de RASCUNHO", async () => {
      repository.findVersionById.mockResolvedValue(buildVersion({ status: "REVISAO" }));

      await expect(
        service.updateVersion("doc-1", "version-1", { conteudoMarkdown: "novo" }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe("getVersionOrThrow (via publish) — isolamento entre documentos", () => {
    it("lança NotFoundException quando a versão pertence a outro documento", async () => {
      repository.findVersionById.mockResolvedValue(buildVersion({ documentId: "outro-doc" }));

      await expect(service.publish("doc-1", "version-1")).rejects.toThrow(NotFoundException);
    });
  });
});
