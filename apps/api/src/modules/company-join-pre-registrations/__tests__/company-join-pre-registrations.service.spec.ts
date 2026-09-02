import { BadRequestException, ForbiddenException, NotFoundException } from "@nestjs/common";


import { CompanyJoinPreRegistrationsService } from "../company-join-pre-registrations.service";

import type { CompanyJoinPreRegistrationRepository } from "../repositories/company-join-pre-registration.repository";
import type { AuthenticatedUser } from "@/common/decorators/current-user.decorator";
import type { AuditLogService } from "@/modules/audit/audit-log.service";
import type { CompanyJoinPreRegistration } from "@prisma/client";

import { Role } from "@/shared/enums";

function buildActor(overrides: Partial<AuthenticatedUser> = {}): AuthenticatedUser {
  return {
    sub: "gestor-1",
    tenantId: "company-1",
    role: Role.GESTOR,
    vinculoId: "membership-1",
    ...overrides,
  };
}

function buildEntry(
  overrides: Partial<CompanyJoinPreRegistration> = {},
): CompanyJoinPreRegistration {
  return {
    id: "pre-1",
    companyId: "company-1",
    criadoPorId: "gestor-1",
    role: Role.MOTORISTA,
    nome: "Carlos Alberto",
    celular: "11999998888",
    status: "PENDENTE",
    vinculadoUserId: null,
    vinculadoEm: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe("CompanyJoinPreRegistrationsService", () => {
  let service: CompanyJoinPreRegistrationsService;
  let repository: jest.Mocked<CompanyJoinPreRegistrationRepository>;
  let auditLogService: jest.Mocked<AuditLogService>;

  beforeEach(() => {
    repository = {
      create: jest.fn(),
      listByCompany: jest.fn(),
      findById: jest.fn(),
      cancel: jest.fn(),
      findMatchingPending: jest.fn(),
      markVinculado: jest.fn(),
    };
    auditLogService = { record: jest.fn() } as unknown as jest.Mocked<AuditLogService>;

    service = new CompanyJoinPreRegistrationsService(repository, auditLogService);
  });

  describe("create", () => {
    it("rejeita ator sem tenant", async () => {
      await expect(
        service.create(buildActor({ tenantId: null }), {
          role: Role.MOTORISTA,
          celular: "11999998888",
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it("rejeita quando nome e celular estão ambos vazios", async () => {
      await expect(service.create(buildActor(), { role: Role.MOTORISTA })).rejects.toThrow(
        BadRequestException,
      );
    });

    it("normaliza o celular (só dígitos) e cria com o companyId/criadoPorId do ator", async () => {
      repository.create.mockResolvedValue(buildEntry());

      await service.create(buildActor(), {
        role: Role.MOTORISTA,
        celular: "(11) 99999-8888",
      });

      expect(repository.create).toHaveBeenCalledWith({
        companyId: "company-1",
        criadoPorId: "gestor-1",
        role: Role.MOTORISTA,
        nome: null,
        celular: "11999998888",
      });
    });

    it("aceita só o nome, sem celular", async () => {
      repository.create.mockResolvedValue(buildEntry({ celular: null }));

      await service.create(buildActor(), { role: Role.MONITOR, nome: "Fernanda Lima" });

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({ nome: "Fernanda Lima", celular: null }),
      );
    });
  });

  describe("listByCompany", () => {
    it("rejeita ator sem tenant", async () => {
      await expect(service.listByCompany(buildActor({ tenantId: null }))).rejects.toThrow(
        ForbiddenException,
      );
    });

    it("lista os pré-cadastros da própria empresa", async () => {
      repository.listByCompany.mockResolvedValue([buildEntry()]);
      const result = await service.listByCompany(buildActor());
      expect(repository.listByCompany).toHaveBeenCalledWith("company-1");
      expect(result.items).toHaveLength(1);
    });
  });

  describe("cancel", () => {
    it("lança NotFoundException quando não encontrado", async () => {
      repository.findById.mockResolvedValue(null);
      await expect(service.cancel(buildActor(), "pre-1")).rejects.toThrow(NotFoundException);
    });

    it("lança BadRequestException quando já vinculado/cancelado", async () => {
      repository.findById.mockResolvedValue(buildEntry({ status: "VINCULADO" }));
      await expect(service.cancel(buildActor(), "pre-1")).rejects.toThrow(BadRequestException);
    });

    it("cancela um pré-cadastro PENDENTE", async () => {
      repository.findById.mockResolvedValue(buildEntry());
      repository.cancel.mockResolvedValue(buildEntry({ status: "CANCELADO" }));

      const result = await service.cancel(buildActor(), "pre-1");

      expect(repository.cancel).toHaveBeenCalledWith("pre-1");
      expect(result.status).toBe("CANCELADO");
    });
  });
});
