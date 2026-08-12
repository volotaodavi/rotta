import { BadRequestException, NotFoundException } from "@nestjs/common";

import { DriversService } from "../drivers.service";

import type { DriverDocumentRepository } from "../repositories/driver-document.repository";
import type { AuthenticatedUser } from "@/common/decorators/current-user.decorator";
import type { SupabaseStorageService } from "@/infra/storage/supabase-storage.service";
import type { AuditLogService } from "@/modules/audit/audit-log.service";
import type { RottaAiService } from "@/modules/rotta-ai/rotta-ai.service";
import type { UsersService } from "@/modules/users/users.service";
import type { DriverDocument, Membership } from "@prisma/client";

import { Role } from "@/shared/enums";

function buildDocument(overrides: Partial<DriverDocument> = {}): DriverDocument {
  return {
    id: "document-1",
    userId: "driver-1",
    companyId: "company-1",
    tipo: "CNH",
    numero: null,
    categoria: null,
    nomeOriginal: "cnh.jpg",
    mimeType: "image/jpeg",
    fileUrl: "https://storage.test/drivers/driver-1/documents/1.jpg",
    vencimentoEm: null,
    rottaAiStatus: "PENDENTE",
    rottaAiQualidadeOk: null,
    rottaAiLegivel: null,
    rottaAiSuspeitaAdulteracao: null,
    rottaAiObservacoes: null,
    rottaAiAnalisadoEm: null,
    uploadedByUserId: "driver-1",
    createdAt: new Date(),
    deletedAt: null,
    ...overrides,
  };
}

function buildFile(overrides: Partial<Express.Multer.File> = {}): Express.Multer.File {
  return {
    originalname: "cnh.jpg",
    mimetype: "image/jpeg",
    buffer: Buffer.from("fake"),
    size: 4,
    ...overrides,
  } as Express.Multer.File;
}

const motoristaActor: AuthenticatedUser = {
  sub: "driver-1",
  tenantId: "company-1",
  role: Role.MOTORISTA,
  vinculoId: "vinculo-1",
};

const outroMotoristaActor: AuthenticatedUser = {
  sub: "driver-2",
  tenantId: "company-1",
  role: Role.MOTORISTA,
  vinculoId: "vinculo-2",
};

const empresaActor: AuthenticatedUser = {
  sub: "gestor-1",
  tenantId: "company-1",
  role: Role.EMPRESA,
  vinculoId: "vinculo-3",
};

const adminActor: AuthenticatedUser = {
  sub: "admin-1",
  tenantId: null,
  role: Role.ADMIN_ROTTA,
  vinculoId: "vinculo-4",
};

describe("DriversService", () => {
  let service: DriversService;
  let documentRepository: jest.Mocked<DriverDocumentRepository>;
  let usersService: jest.Mocked<UsersService>;
  let auditLogService: jest.Mocked<AuditLogService>;
  let storageService: jest.Mocked<SupabaseStorageService>;
  let rottaAiService: jest.Mocked<RottaAiService>;

  beforeEach(() => {
    documentRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      updateAiResult: jest.fn(),
      listByUser: jest.fn(),
      listExpiringSoon: jest.fn(),
      softDelete: jest.fn(),
    };
    usersService = { findActiveMembership: jest.fn() } as unknown as jest.Mocked<UsersService>;
    auditLogService = { record: jest.fn() } as unknown as jest.Mocked<AuditLogService>;
    storageService = {
      upload: jest.fn(),
      uploadPrivate: jest.fn(),
      getSignedUrl: jest.fn(),
    } as unknown as jest.Mocked<SupabaseStorageService>;
    rottaAiService = {
      validateDocument: jest.fn(),
      analyzeDriverDocument: jest.fn(),
    } as unknown as jest.Mocked<RottaAiService>;

    service = new DriversService(
      documentRepository,
      usersService,
      auditLogService,
      storageService,
      rottaAiService,
    );

    storageService.uploadPrivate.mockResolvedValue({
      path: "drivers/driver-1/documents/1.jpg",
      url: "https://storage.test/drivers/driver-1/documents/1.jpg?token=signed",
    });
    documentRepository.create.mockResolvedValue(buildDocument());
    documentRepository.findById.mockResolvedValue(buildDocument());
  });

  describe("resolveCompanyContext (via uploadDocument)", () => {
    it("permite que o motorista envie o próprio documento", async () => {
      documentRepository.updateAiResult.mockResolvedValue(
        buildDocument({ rottaAiStatus: "INDISPONIVEL" }),
      );
      rottaAiService.validateDocument.mockRejectedValue(new Error("stub"));

      await expect(
        service.uploadDocument(
          "driver-1",
          { tipo: "CNH" } as never,
          buildFile(),
          motoristaActor,
          {},
        ),
      ).resolves.toBeDefined();

      expect(documentRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ userId: "driver-1", companyId: "company-1" }),
      );
    });

    it("rejeita quando um motorista tenta acessar documento de outro motorista", async () => {
      await expect(
        service.uploadDocument(
          "driver-1",
          { tipo: "CNH" } as never,
          buildFile(),
          outroMotoristaActor,
          {},
        ),
      ).rejects.toThrow(NotFoundException);

      expect(documentRepository.create).not.toHaveBeenCalled();
    });

    it("permite que Empresa/Gestor envie documento de motorista com Membership ativo na empresa", async () => {
      usersService.findActiveMembership.mockResolvedValue({ role: "motorista" } as Membership);
      documentRepository.updateAiResult.mockResolvedValue(buildDocument());
      rottaAiService.validateDocument.mockRejectedValue(new Error("stub"));

      await service.uploadDocument(
        "driver-1",
        { tipo: "CNH" } as never,
        buildFile(),
        empresaActor,
        {},
      );

      expect(usersService.findActiveMembership).toHaveBeenCalledWith("driver-1", "company-1");
      expect(documentRepository.create).toHaveBeenCalled();
    });

    it("rejeita Empresa/Gestor quando o motorista não tem Membership ativo na empresa", async () => {
      usersService.findActiveMembership.mockResolvedValue(null);

      await expect(
        service.uploadDocument("driver-1", { tipo: "CNH" } as never, buildFile(), empresaActor, {}),
      ).rejects.toThrow(NotFoundException);
    });

    it("exige companyId explícito quando o ator é Admin Rotta", async () => {
      await expect(
        service.uploadDocument("driver-1", { tipo: "CNH" } as never, buildFile(), adminActor, {}),
      ).rejects.toThrow(BadRequestException);
    });

    it("permite Admin Rotta informando companyId", async () => {
      documentRepository.updateAiResult.mockResolvedValue(buildDocument());
      rottaAiService.validateDocument.mockRejectedValue(new Error("stub"));

      await service.uploadDocument(
        "driver-1",
        { tipo: "CNH" } as never,
        buildFile(),
        adminActor,
        {},
        "company-1",
      );

      expect(documentRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ companyId: "company-1" }),
      );
    });
  });

  describe("uploadDocument — validação e Rotta AI", () => {
    it("rejeita arquivo que não é PDF nem imagem", async () => {
      await expect(
        service.uploadDocument(
          "driver-1",
          { tipo: "CNH" } as never,
          buildFile({ mimetype: "text/plain" }),
          motoristaActor,
          {},
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it("marca INDISPONIVEL quando o download do arquivo falha (EAR/CURSO, Frente F)", async () => {
      documentRepository.create.mockResolvedValue(buildDocument({ tipo: "EAR" }));
      documentRepository.updateAiResult.mockResolvedValue(
        buildDocument({ tipo: "EAR", rottaAiStatus: "INDISPONIVEL" }),
      );
      rottaAiService.analyzeDriverDocument.mockRejectedValue(new Error("download falhou"));

      const result = await service.uploadDocument(
        "driver-1",
        { tipo: "EAR" } as never,
        buildFile(),
        motoristaActor,
        {},
      );

      expect(rottaAiService.analyzeDriverDocument).toHaveBeenCalledWith({
        tipo: "EAR",
        referenciaArquivo: expect.any(String),
      });
      expect(rottaAiService.validateDocument).not.toHaveBeenCalled();
      expect(documentRepository.updateAiResult).toHaveBeenCalledWith(
        "document-1",
        expect.objectContaining({ rottaAiStatus: "INDISPONIVEL" }),
      );
      expect(result.rottaAiStatus).toBe("INDISPONIVEL");
    });

    it("marca REPROVADO quando o EAR/CURSO tem defeito real de imagem (Frente F, qualidadeAdequada=false)", async () => {
      documentRepository.create.mockResolvedValue(buildDocument({ tipo: "EAR" }));
      documentRepository.updateAiResult.mockResolvedValue(
        buildDocument({ tipo: "EAR", rottaAiStatus: "REPROVADO" }),
      );
      rottaAiService.analyzeDriverDocument.mockResolvedValue({
        tipo: "EAR",
        formatoValido: true,
        formatoDetectado: "jpeg",
        larguraPx: 100,
        alturaPx: 80,
        qualidadeAdequada: false,
        tamanhoBytes: 2_000,
        avisos: ["Resolução baixa (100x80px)."],
        analiseCompleta: false,
      });

      const result = await service.uploadDocument(
        "driver-1",
        { tipo: "EAR" } as never,
        buildFile(),
        motoristaActor,
        {},
      );

      expect(documentRepository.updateAiResult).toHaveBeenCalledWith(
        "document-1",
        expect.objectContaining({ rottaAiStatus: "REPROVADO" }),
      );
      expect(result.rottaAiStatus).toBe("REPROVADO");
    });

    it("marca INDISPONIVEL (nunca APROVADO/PENDENTE) quando o EAR/CURSO tem qualidade de imagem OK (Frente F) — conteúdo não verificado, e PENDENTE prenderia a elegibilidade escolar num limbo sem saída", async () => {
      documentRepository.create.mockResolvedValue(
        buildDocument({ tipo: "CURSO_TRANSPORTE_ESCOLAR" }),
      );
      documentRepository.updateAiResult.mockResolvedValue(
        buildDocument({ tipo: "CURSO_TRANSPORTE_ESCOLAR", rottaAiStatus: "INDISPONIVEL" }),
      );
      rottaAiService.analyzeDriverDocument.mockResolvedValue({
        tipo: "CURSO",
        formatoValido: true,
        formatoDetectado: "png",
        larguraPx: 1200,
        alturaPx: 900,
        qualidadeAdequada: true,
        tamanhoBytes: 50_000,
        avisos: ["Esta análise cobre apenas formato e resolução da imagem."],
        analiseCompleta: false,
      });

      const result = await service.uploadDocument(
        "driver-1",
        { tipo: "CURSO_TRANSPORTE_ESCOLAR" } as never,
        buildFile(),
        motoristaActor,
        {},
      );

      expect(rottaAiService.analyzeDriverDocument).toHaveBeenCalledWith({
        tipo: "CURSO",
        referenciaArquivo: expect.any(String),
      });
      expect(documentRepository.updateAiResult).toHaveBeenCalledWith(
        "document-1",
        expect.objectContaining({ rottaAiStatus: "INDISPONIVEL" }),
      );
      expect(result.rottaAiStatus).toBe("INDISPONIVEL");
    });

    it("marca APROVADO quando a Didit aprova a CNH", async () => {
      rottaAiService.validateDocument.mockResolvedValue({
        aprovado: true,
        status: "approved",
        provedor: "didit",
        dadosBrutos: {},
      });
      documentRepository.updateAiResult.mockResolvedValue(
        buildDocument({ rottaAiStatus: "APROVADO" }),
      );

      const result = await service.uploadDocument(
        "driver-1",
        { tipo: "CNH" } as never,
        buildFile(),
        motoristaActor,
        {},
      );

      expect(documentRepository.updateAiResult).toHaveBeenCalledWith(
        "document-1",
        expect.objectContaining({ rottaAiStatus: "APROVADO" }),
      );
      expect(result.rottaAiStatus).toBe("APROVADO");
    });

    it("pula a análise da Rotta AI para tipos sem check equivalente (ANTECEDENTES_CRIMINAIS/OUTRO)", async () => {
      documentRepository.create.mockResolvedValue(
        buildDocument({ tipo: "ANTECEDENTES_CRIMINAIS" }),
      );

      await service.uploadDocument(
        "driver-1",
        { tipo: "ANTECEDENTES_CRIMINAIS" } as never,
        buildFile(),
        motoristaActor,
        {},
      );

      expect(rottaAiService.validateDocument).not.toHaveBeenCalled();
      expect(documentRepository.updateAiResult).not.toHaveBeenCalled();
    });
  });

  describe("listDocuments", () => {
    it("lista os documentos do próprio motorista", async () => {
      documentRepository.listByUser.mockResolvedValue([buildDocument()]);

      const result = await service.listDocuments("driver-1", motoristaActor, undefined, undefined);

      expect(documentRepository.listByUser).toHaveBeenCalledWith({
        userId: "driver-1",
        tipo: undefined,
      });
      expect(result).toHaveLength(1);
    });

    it("rejeita listar documentos de outro motorista sem vínculo", async () => {
      await expect(
        service.listDocuments("driver-1", outroMotoristaActor, undefined, undefined),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("removeDocument", () => {
    it("remove (soft delete) o documento — só Empresa/Gestor/Admin (RBAC no controller)", async () => {
      documentRepository.findById.mockResolvedValue(buildDocument());
      usersService.findActiveMembership.mockResolvedValue({ role: "motorista" } as Membership);

      await service.removeDocument("driver-1", "document-1", empresaActor, {});

      expect(documentRepository.softDelete).toHaveBeenCalledWith("document-1");
      expect(auditLogService.record).toHaveBeenCalledWith(
        expect.objectContaining({ acao: "DRIVER_DOCUMENT_REMOVED" }),
      );
    });

    it("lança NotFoundException quando o documento não pertence ao motorista informado", async () => {
      documentRepository.findById.mockResolvedValue(buildDocument({ userId: "driver-2" }));
      usersService.findActiveMembership.mockResolvedValue({ role: "motorista" } as Membership);

      await expect(
        service.removeDocument("driver-1", "document-1", empresaActor, {}),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
