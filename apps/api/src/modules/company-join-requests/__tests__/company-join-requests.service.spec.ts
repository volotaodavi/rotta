import { BadRequestException, ForbiddenException, NotFoundException } from "@nestjs/common";

import { CompanyJoinRequestsService } from "../company-join-requests.service";

import type {
  CompanyJoinRequestRepository,
  CompanyJoinRequestWithUser,
} from "../repositories/company-join-request.repository";
import type { AuthenticatedUser } from "@/common/decorators/current-user.decorator";
import type { AuditLogService } from "@/modules/audit/audit-log.service";
import type { CompanyRepository } from "@/modules/companies/repositories/company.repository";
import type { UsersService } from "@/modules/users/users.service";
import type { Company } from "@prisma/client";

import { Role } from "@/shared/enums";

function buildActor(overrides: Partial<AuthenticatedUser> = {}): AuthenticatedUser {
  return {
    sub: "user-1",
    tenantId: null,
    role: Role.MOTORISTA,
    vinculoId: "user-1",
    ...overrides,
  };
}

function buildRequest(
  overrides: Partial<CompanyJoinRequestWithUser> = {},
): CompanyJoinRequestWithUser {
  return {
    id: "join-1",
    companyId: "company-1",
    userId: "user-1",
    role: Role.MOTORISTA,
    status: "PENDENTE",
    motivoRecusa: null,
    decididoPorId: null,
    decidedAt: null,
    createdAt: new Date(),
    company: { id: "company-1", nomeFantasia: "Gama Transportes" },
    user: { id: "user-1", nome: "João Motorista", email: "joao@x.com", telefone: "11999998888" },
    ...overrides,
  };
}

describe("CompanyJoinRequestsService", () => {
  let service: CompanyJoinRequestsService;
  let joinRequestRepository: jest.Mocked<CompanyJoinRequestRepository>;
  let companyRepository: jest.Mocked<CompanyRepository>;
  let usersService: jest.Mocked<UsersService>;
  let auditLogService: jest.Mocked<AuditLogService>;

  beforeEach(() => {
    joinRequestRepository = {
      create: jest.fn(),
      findLatestByUser: jest.fn(),
      findById: jest.fn(),
      findPendingByCompany: jest.fn(),
      decide: jest.fn(),
    };
    companyRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      findByCpfCnpj: jest.fn(),
      update: jest.fn(),
      list: jest.fn(),
      nextCodigoInternoSequence: jest.fn(),
      findActiveByCodigoInterno: jest.fn(),
      listComPixProximoVencimento: jest.fn(),
    };
    usersService = {
      createMembership: jest.fn(),
      clearAutonomoRole: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<UsersService>;
    auditLogService = { record: jest.fn() } as unknown as jest.Mocked<AuditLogService>;

    service = new CompanyJoinRequestsService(
      joinRequestRepository,
      companyRepository,
      usersService,
      auditLogService,
    );
  });

  describe("create", () => {
    it("rejeita quem já tem vínculo (tenantId presente)", async () => {
      await expect(
        service.create(buildActor({ tenantId: "company-1" }), { codigoInterno: "TRN-000001" }),
      ).rejects.toThrow(BadRequestException);
    });

    it("rejeita quando já existe um pedido PENDENTE", async () => {
      joinRequestRepository.findLatestByUser.mockResolvedValue(buildRequest());
      await expect(service.create(buildActor(), { codigoInterno: "TRN-000001" })).rejects.toThrow(
        BadRequestException,
      );
    });

    it("lança NotFoundException quando o código não resolve nenhuma transportadora ativa", async () => {
      joinRequestRepository.findLatestByUser.mockResolvedValue(null);
      companyRepository.findActiveByCodigoInterno.mockResolvedValue(null);
      await expect(service.create(buildActor(), { codigoInterno: "TRN-999999" })).rejects.toThrow(
        NotFoundException,
      );
    });

    it("normaliza o código (trim + uppercase) antes de resolver a empresa e cria o pedido PENDENTE", async () => {
      joinRequestRepository.findLatestByUser.mockResolvedValue(null);
      companyRepository.findActiveByCodigoInterno.mockResolvedValue({
        id: "company-1",
      } as Company);
      joinRequestRepository.create.mockResolvedValue(buildRequest());

      const result = await service.create(buildActor(), { codigoInterno: " trn-000001 " });

      expect(companyRepository.findActiveByCodigoInterno).toHaveBeenCalledWith("TRN-000001");
      expect(joinRequestRepository.create).toHaveBeenCalledWith({
        companyId: "company-1",
        userId: "user-1",
        role: Role.MOTORISTA,
      });
      expect(result.status).toBe("PENDENTE");
      expect(result.companyName).toBe("Gama Transportes");
    });

    it("permite um novo pedido quando o último foi RECUSADO", async () => {
      joinRequestRepository.findLatestByUser.mockResolvedValue(
        buildRequest({ status: "RECUSADO" }),
      );
      companyRepository.findActiveByCodigoInterno.mockResolvedValue({
        id: "company-1",
      } as Company);
      joinRequestRepository.create.mockResolvedValue(buildRequest());

      await expect(
        service.create(buildActor(), { codigoInterno: "TRN-000001" }),
      ).resolves.toBeDefined();
    });
  });

  describe("findMine", () => {
    it("retorna null quando o usuário nunca pediu vínculo nenhum", async () => {
      joinRequestRepository.findLatestByUser.mockResolvedValue(null);
      await expect(service.findMine(buildActor())).resolves.toBeNull();
    });

    it("retorna o pedido mais recente", async () => {
      joinRequestRepository.findLatestByUser.mockResolvedValue(buildRequest());
      const result = await service.findMine(buildActor());
      expect(result?.id).toBe("join-1");
    });
  });

  describe("findPendingForCompany", () => {
    it("rejeita ator sem tenant (não é Empresa/Gestor de nenhuma empresa)", async () => {
      await expect(service.findPendingForCompany(buildActor())).rejects.toThrow(ForbiddenException);
    });

    it("lista os pedidos PENDENTE da própria empresa do ator", async () => {
      joinRequestRepository.findPendingByCompany.mockResolvedValue([buildRequest()]);
      const result = await service.findPendingForCompany(
        buildActor({ role: Role.EMPRESA, tenantId: "company-1" }),
      );
      expect(joinRequestRepository.findPendingByCompany).toHaveBeenCalledWith("company-1");
      expect(result).toHaveLength(1);
      expect(result[0]!.userName).toBe("João Motorista");
    });
  });

  describe("approve", () => {
    const empresaActor = buildActor({ role: Role.EMPRESA, tenantId: "company-1", sub: "gestor-1" });

    it("rejeita ator sem tenant", async () => {
      await expect(service.approve(buildActor(), "join-1")).rejects.toThrow(ForbiddenException);
    });

    it("lança NotFoundException quando o pedido não pertence à empresa do ator", async () => {
      joinRequestRepository.findById.mockResolvedValue(buildRequest({ companyId: "company-2" }));
      await expect(service.approve(empresaActor, "join-1")).rejects.toThrow(NotFoundException);
    });

    it("lança BadRequestException quando o pedido já foi decidido", async () => {
      joinRequestRepository.findById.mockResolvedValue(buildRequest({ status: "APROVADO" }));
      await expect(service.approve(empresaActor, "join-1")).rejects.toThrow(BadRequestException);
    });

    it("cria o Membership, marca APROVADO e limpa o autonomoRole do usuário", async () => {
      joinRequestRepository.findById.mockResolvedValue(buildRequest());
      joinRequestRepository.decide.mockResolvedValue({
        ...buildRequest(),
        status: "APROVADO",
        decidedAt: new Date(),
        decididoPorId: "gestor-1",
      });

      const result = await service.approve(empresaActor, "join-1");

      expect(usersService.createMembership).toHaveBeenCalledWith({
        userId: "user-1",
        companyId: "company-1",
        role: Role.MOTORISTA,
        convidadoPorId: "gestor-1",
      });
      expect(joinRequestRepository.decide).toHaveBeenCalledWith(
        "join-1",
        expect.objectContaining({ status: "APROVADO", decididoPorId: "gestor-1" }),
      );
      expect(usersService.clearAutonomoRole).toHaveBeenCalledWith("user-1");
      expect(result.status).toBe("APROVADO");
    });
  });

  describe("reject", () => {
    const empresaActor = buildActor({ role: Role.EMPRESA, tenantId: "company-1", sub: "gestor-1" });

    it("marca RECUSADO com o motivo informado, sem criar Membership", async () => {
      joinRequestRepository.findById.mockResolvedValue(buildRequest());
      joinRequestRepository.decide.mockResolvedValue({
        ...buildRequest(),
        status: "RECUSADO",
        motivoRecusa: "Não reconhecido",
        decidedAt: new Date(),
        decididoPorId: "gestor-1",
      });

      const result = await service.reject(empresaActor, "join-1", { motivo: "Não reconhecido" });

      expect(usersService.createMembership).not.toHaveBeenCalled();
      expect(joinRequestRepository.decide).toHaveBeenCalledWith(
        "join-1",
        expect.objectContaining({ status: "RECUSADO", motivoRecusa: "Não reconhecido" }),
      );
      expect(result.status).toBe("RECUSADO");
      expect(result.motivoRecusa).toBe("Não reconhecido");
    });
  });
});
