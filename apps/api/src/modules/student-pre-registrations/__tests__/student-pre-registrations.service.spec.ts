import { BadRequestException, ForbiddenException, NotFoundException } from "@nestjs/common";

import { StudentPreRegistrationsService } from "../student-pre-registrations.service";

import type {
  StudentPreRegistrationRepository,
  StudentPreRegistrationWithCompany,
} from "../repositories/student-pre-registration.repository";
import type { AuthenticatedUser } from "@/common/decorators/current-user.decorator";
import type { CompanyRepository } from "@/modules/companies/repositories/company.repository";
import type { Company, StudentPreRegistration } from "@prisma/client";

import { Role } from "@/shared/enums";

function buildActor(overrides: Partial<AuthenticatedUser> = {}): AuthenticatedUser {
  return {
    sub: "responsavel-1",
    tenantId: null,
    role: Role.RESPONSAVEL,
    vinculoId: "responsavel-1",
    ...overrides,
  };
}

function buildEntity(overrides: Partial<StudentPreRegistration> = {}): StudentPreRegistration {
  return {
    id: "pre-1",
    companyId: "company-1",
    criadoPorId: "user-empresa",
    nomeAluno: "Lucas Silva",
    nomeResponsavel: "Ana Silva",
    celularResponsavel: "11988887777",
    status: "PENDENTE",
    reclamadoPorId: null,
    reclamadoEm: null,
    studentId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function buildEntityWithCompany(
  overrides: Partial<StudentPreRegistrationWithCompany> = {},
): StudentPreRegistrationWithCompany {
  return {
    ...buildEntity(),
    company: { id: "company-1", nomeFantasia: "Transportadora Exemplo" },
    ...overrides,
  };
}

describe("StudentPreRegistrationsService", () => {
  let service: StudentPreRegistrationsService;
  let repository: jest.Mocked<StudentPreRegistrationRepository>;
  let companyRepository: jest.Mocked<CompanyRepository>;

  beforeEach(() => {
    repository = {
      create: jest.fn(),
      listByCompany: jest.fn(),
      findById: jest.fn(),
      cancel: jest.fn(),
      findPendingByCompanyAndCelular: jest.fn(),
      findByIdWithCompany: jest.fn(),
      claim: jest.fn(),
      markConcluded: jest.fn(),
    };
    companyRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      findByIdWithPlan: jest.fn(),
      findByCnpj: jest.fn(),
      update: jest.fn(),
      list: jest.fn(),
      remove: jest.fn(),
      findActiveByCodigoInterno: jest.fn(),
      nextCodigoInternoSequence: jest.fn(),
    } as unknown as jest.Mocked<CompanyRepository>;

    service = new StudentPreRegistrationsService(repository, companyRepository);
  });

  describe("create", () => {
    it("normaliza o celular (só dígitos) e usa actor.tenantId como companyId", async () => {
      repository.create.mockResolvedValue(buildEntity());

      await service.create(buildActor({ role: Role.EMPRESA, tenantId: "company-1" }), {
        nomeAluno: "Lucas Silva",
        nomeResponsavel: "Ana Silva",
        celularResponsavel: "(11) 98888-7777",
      });

      expect(repository.create).toHaveBeenCalledWith({
        companyId: "company-1",
        criadoPorId: "responsavel-1",
        nomeAluno: "Lucas Silva",
        nomeResponsavel: "Ana Silva",
        celularResponsavel: "11988887777",
      });
    });

    it("rejeita quem não pertence a nenhuma empresa", async () => {
      await expect(
        service.create(buildActor({ tenantId: null }), {
          nomeAluno: "Lucas Silva",
          nomeResponsavel: "Ana Silva",
          celularResponsavel: "11988887777",
        }),
      ).rejects.toThrow(ForbiddenException);
      expect(repository.create).not.toHaveBeenCalled();
    });
  });

  describe("cancel", () => {
    it("cancela um pré-cadastro PENDENTE", async () => {
      repository.findById.mockResolvedValue(buildEntity());
      repository.cancel.mockResolvedValue(buildEntity({ status: "CANCELADO" }));

      const result = await service.cancel(
        buildActor({ role: Role.EMPRESA, tenantId: "company-1" }),
        "pre-1",
      );

      expect(result.status).toBe("CANCELADO");
    });

    it("rejeita cancelar um pré-cadastro já reivindicado", async () => {
      repository.findById.mockResolvedValue(buildEntity({ status: "RECLAMADO" }));

      await expect(
        service.cancel(buildActor({ role: Role.EMPRESA, tenantId: "company-1" }), "pre-1"),
      ).rejects.toThrow(BadRequestException);
    });

    it("404 (não-enumeração) quando o RLS já bloqueou (id de outra empresa)", async () => {
      repository.findById.mockResolvedValue(null);

      await expect(
        service.cancel(
          buildActor({ role: Role.EMPRESA, tenantId: "company-1" }),
          "pre-de-outra-empresa",
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("previewCompanyByCodigo", () => {
    it("devolve a transportadora quando o código existe, mesmo sem nenhum pré-cadastro pendente", async () => {
      companyRepository.findActiveByCodigoInterno.mockResolvedValue({
        id: "company-1",
        nomeFantasia: "Transportadora Exemplo",
      } as Company);

      const result = await service.previewCompanyByCodigo("trn-000001");

      expect(companyRepository.findActiveByCodigoInterno).toHaveBeenCalledWith("TRN-000001");
      expect(result).toEqual({ companyId: "company-1", companyName: "Transportadora Exemplo" });
    });

    it("devolve null (nunca um erro) quando o código não existe", async () => {
      companyRepository.findActiveByCodigoInterno.mockResolvedValue(null);

      const result = await service.previewCompanyByCodigo("NAOEXISTE");

      expect(result).toBeNull();
    });

    it("devolve null sem consultar o repositório quando o código vem vazio", async () => {
      const result = await service.previewCompanyByCodigo("   ");

      expect(result).toBeNull();
      expect(companyRepository.findActiveByCodigoInterno).not.toHaveBeenCalled();
    });
  });

  describe("lookup", () => {
    it("resolve o código da empresa e devolve null (não erro) quando não bate nada", async () => {
      companyRepository.findActiveByCodigoInterno.mockResolvedValue({
        id: "company-1",
      } as Company);
      repository.findPendingByCompanyAndCelular.mockResolvedValue(null);

      const result = await service.lookup({ codigoInterno: "trn-000001", celular: "11988887777" });

      expect(companyRepository.findActiveByCodigoInterno).toHaveBeenCalledWith("TRN-000001");
      expect(result).toBeNull();
    });

    it("devolve null quando o código não existe (nunca lança 404 barulhento)", async () => {
      companyRepository.findActiveByCodigoInterno.mockResolvedValue(null);

      const result = await service.lookup({ codigoInterno: "TRN-999999", celular: "11988887777" });

      expect(result).toBeNull();
      expect(repository.findPendingByCompanyAndCelular).not.toHaveBeenCalled();
    });

    it("normaliza o celular buscado do mesmo jeito que foi salvo", async () => {
      companyRepository.findActiveByCodigoInterno.mockResolvedValue({
        id: "company-1",
      } as Company);
      repository.findPendingByCompanyAndCelular.mockResolvedValue(buildEntityWithCompany());

      const result = await service.lookup({
        codigoInterno: "TRN-000001",
        celular: "+55 (11) 98888-7777",
      });

      expect(repository.findPendingByCompanyAndCelular).toHaveBeenCalledWith(
        "company-1",
        "5511988887777",
      );
      expect(result).toEqual({
        id: "pre-1",
        companyName: "Transportadora Exemplo",
        nomeAluno: "Lucas Silva",
        nomeResponsavel: "Ana Silva",
      });
    });
  });

  describe("claim", () => {
    it("caminho 'Continuar' — reivindica um pré-cadastro PENDENTE", async () => {
      repository.findByIdWithCompany.mockResolvedValue(buildEntityWithCompany());
      repository.claim.mockResolvedValue(buildEntity({ status: "RECLAMADO" }));

      const result = await service.claim(buildActor(), "pre-1");

      expect(repository.claim).toHaveBeenCalledWith("pre-1", {
        status: "RECLAMADO",
        reclamadoPorId: "responsavel-1",
        reclamadoEm: expect.any(Date),
      });
      expect(result.nomeAluno).toBe("Lucas Silva");
    });

    it("rejeita reivindicar um pré-cadastro que já não está mais PENDENTE", async () => {
      repository.findByIdWithCompany.mockResolvedValue(
        buildEntityWithCompany({ status: "RECLAMADO" }),
      );

      await expect(service.claim(buildActor(), "pre-1")).rejects.toThrow(BadRequestException);
      expect(repository.claim).not.toHaveBeenCalled();
    });

    it("404 quando o id não existe", async () => {
      repository.findByIdWithCompany.mockResolvedValue(null);

      await expect(service.claim(buildActor(), "pre-inexistente")).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
