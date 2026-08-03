import { BadRequestException, ConflictException, NotFoundException } from "@nestjs/common";
import { CompanyStatus, CompanyType } from "@prisma/client";

import { CompaniesService } from "../companies.service";

import type { CreateCompanyDto } from "../dto/create-company.dto";
import type { CompanySettingRepository } from "../repositories/company-setting.repository";
import type { CompanyRepository, CompanyWithPlan } from "../repositories/company.repository";
import type { PlanRepository } from "../repositories/plan.repository";
import type { AuthenticatedUser } from "@/common/decorators/current-user.decorator";
import type { PrismaService } from "@/infra/database/prisma.service";
import type { SupabaseStorageService } from "@/infra/storage/supabase-storage.service";
import type { AuditLogService } from "@/modules/audit/audit-log.service";
import type { UsersService } from "@/modules/users/users.service";
import type { VehiclesService } from "@/modules/vehicles/vehicles.service";

import { Role } from "@/shared/enums";

const STARTER_PLAN = {
  id: "plan-1",
  code: "STARTER",
  name: "Starter",
  priceCents: 3990,
  isActive: true,
};

function buildCompany(overrides: Partial<CompanyWithPlan> = {}): CompanyWithPlan {
  return {
    id: "company-1",
    razaoSocial: "Transportes Rotta LTDA",
    nomeFantasia: "Rotta Transportes",
    cpfCnpj: "11222333000181",
    tipo: CompanyType.LTDA,
    email: "contato@rottatransportes.com.br",
    telefone: "11987654321",
    whatsapp: null,
    cep: "01310100",
    endereco: "Avenida Paulista",
    numero: "1000",
    complemento: null,
    bairro: "Bela Vista",
    cidade: "São Paulo",
    estado: "SP",
    latitude: null,
    longitude: null,
    logoUrl: null,
    fotoUrl: null,
    corPrimaria: "#3B6EF6",
    idioma: "pt-BR",
    fusoHorario: "America/Sao_Paulo",
    status: CompanyStatus.TRIAL,
    planId: STARTER_PLAN.id,
    plan: STARTER_PLAN,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    ...overrides,
  };
}

function buildCreateDto(overrides: Partial<CreateCompanyDto> = {}): CreateCompanyDto {
  return {
    razaoSocial: "Transportes Rotta LTDA",
    nomeFantasia: "Rotta Transportes",
    cpfCnpj: "11222333000181",
    tipo: CompanyType.LTDA,
    email: "contato@rottatransportes.com.br",
    telefone: "11987654321",
    cep: "01310100",
    endereco: "Avenida Paulista",
    numero: "1000",
    bairro: "Bela Vista",
    cidade: "São Paulo",
    estado: "SP",
    administrador: {
      nome: "Ana Souza",
      email: "ana@rottatransportes.com.br",
      telefone: "11912345678",
      cpf: "52998224725",
      senha: "SenhaForte123",
    },
    ...overrides,
  };
}

const adminActor: AuthenticatedUser = {
  sub: "admin-1",
  tenantId: null,
  role: Role.ADMIN_ROTTA,
  vinculoId: "vinculo-1",
};

describe("CompaniesService", () => {
  let service: CompaniesService;
  let companyRepository: jest.Mocked<CompanyRepository>;
  let settingRepository: jest.Mocked<CompanySettingRepository>;
  let planRepository: jest.Mocked<PlanRepository>;
  let usersService: jest.Mocked<UsersService>;
  let auditLogService: jest.Mocked<AuditLogService>;
  let storageService: jest.Mocked<SupabaseStorageService>;
  let prisma: jest.Mocked<PrismaService>;
  let vehiclesService: jest.Mocked<VehiclesService>;

  beforeEach(() => {
    companyRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      findByCpfCnpj: jest.fn(),
      update: jest.fn(),
      list: jest.fn(),
    };
    settingRepository = { upsertMany: jest.fn(), listByCompany: jest.fn() };
    planRepository = { findByCode: jest.fn(), findById: jest.fn(), listActive: jest.fn() };
    usersService = {
      findByIdentifier: jest.fn(),
      assertNoDuplicateIdentity: jest.fn(),
      createUserWithPassword: jest.fn(),
      createMembership: jest.fn(),
      listMembershipsByCompany: jest.fn(),
    } as unknown as jest.Mocked<UsersService>;
    auditLogService = {
      record: jest.fn(),
      listByCompany: jest.fn(),
    } as unknown as jest.Mocked<AuditLogService>;
    storageService = { upload: jest.fn() } as unknown as jest.Mocked<SupabaseStorageService>;
    prisma = {
      runInTenantTransaction: jest.fn((fn: (tx: unknown) => unknown) => fn({})),
    } as unknown as jest.Mocked<PrismaService>;
    vehiclesService = { countActive: jest.fn() } as unknown as jest.Mocked<VehiclesService>;

    service = new CompaniesService(
      companyRepository,
      settingRepository,
      planRepository,
      usersService,
      auditLogService,
      storageService,
      prisma,
      vehiclesService,
    );

    planRepository.findByCode.mockResolvedValue(STARTER_PLAN);
    companyRepository.findByCpfCnpj.mockResolvedValue(null);
    usersService.assertNoDuplicateIdentity.mockResolvedValue(undefined);
  });

  describe("create", () => {
    it("rejeita CNPJ com tamanho de CPF para empresa LTDA", async () => {
      const dto = buildCreateDto({ cpfCnpj: "52998224725" });
      await expect(service.create(dto, adminActor, {})).rejects.toThrow(BadRequestException);
    });

    it("rejeita motorista autônomo cujo CPF da empresa diverge do administrador", async () => {
      const dto = buildCreateDto({
        tipo: CompanyType.AUTONOMO,
        cpfCnpj: "52998224725",
        administrador: {
          nome: "João",
          email: "joao@rotta.com.br",
          telefone: "11911112222",
          cpf: "11144477735",
          senha: "SenhaForte123",
        },
      });
      await expect(service.create(dto, adminActor, {})).rejects.toThrow(BadRequestException);
    });

    it("rejeita CPF/CNPJ já cadastrado", async () => {
      companyRepository.findByCpfCnpj.mockResolvedValue(buildCompany());
      await expect(service.create(buildCreateDto(), adminActor, {})).rejects.toThrow(
        ConflictException,
      );
    });

    it("cria a empresa, o administrador e o vínculo em uma única transação", async () => {
      const company = buildCompany();
      companyRepository.create.mockResolvedValue(company);
      usersService.createUserWithPassword.mockResolvedValue({
        id: "user-1",
        nome: "Ana Souza",
        email: "ana@rottatransportes.com.br",
        telefone: "11912345678",
        cpf: "52998224725",
        passwordHash: "hash",
        status: "ATIVO",
        avatarUrl: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      });

      const result = await service.create(buildCreateDto(), adminActor, { ip: "127.0.0.1" });

      expect(prisma.runInTenantTransaction).toHaveBeenCalledTimes(1);
      expect(companyRepository.create).toHaveBeenCalledTimes(1);
      expect(usersService.createUserWithPassword).toHaveBeenCalledTimes(1);
      expect(usersService.createMembership).toHaveBeenCalledWith(
        expect.objectContaining({ userId: "user-1", companyId: company.id, role: Role.EMPRESA }),
        expect.anything(),
      );
      expect(auditLogService.record).toHaveBeenCalledWith(
        expect.objectContaining({ acao: "CREATED" }),
      );
      expect(result.id).toBe(company.id);
    });

    it("não deixa a criação da empresa falhar quando o registro de auditoria falha", async () => {
      companyRepository.create.mockResolvedValue(buildCompany());
      usersService.createUserWithPassword.mockResolvedValue({
        id: "user-1",
        nome: "Ana",
        email: "ana@rottatransportes.com.br",
        telefone: "11912345678",
        cpf: "52998224725",
        passwordHash: "hash",
        status: "ATIVO",
        avatarUrl: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      });
      auditLogService.record.mockRejectedValue(new Error("falha de rede"));

      await expect(service.create(buildCreateDto(), adminActor, {})).resolves.toBeDefined();
    });
  });

  describe("findByIdOrThrow", () => {
    it("nunca deixa um papel de tenant acessar outra empresa (404, não 403)", async () => {
      const otherTenantActor: AuthenticatedUser = {
        sub: "u1",
        tenantId: "outro-tenant",
        role: Role.EMPRESA,
        vinculoId: "v1",
      };

      await expect(service.findByIdOrThrow("company-1", otherTenantActor)).rejects.toThrow(
        NotFoundException,
      );
      expect(companyRepository.findById).not.toHaveBeenCalled();
    });

    it("permite que a própria empresa veja seus dados", async () => {
      const company = buildCompany();
      companyRepository.findById.mockResolvedValue(company);
      const ownActor: AuthenticatedUser = {
        sub: "u1",
        tenantId: company.id,
        role: Role.EMPRESA,
        vinculoId: "v1",
      };

      const result = await service.findByIdOrThrow(company.id, ownActor);
      expect(result.id).toBe(company.id);
    });
  });

  describe("getDashboard", () => {
    it("reflete a contagem real de veículos ativos (nunca hardcoded em zero)", async () => {
      const company = buildCompany();
      companyRepository.findById.mockResolvedValue(company);
      usersService.listMembershipsByCompany.mockResolvedValue([]);
      vehiclesService.countActive.mockResolvedValue(3);
      const ownActor: AuthenticatedUser = {
        sub: "u1",
        tenantId: company.id,
        role: Role.EMPRESA,
        vinculoId: "v1",
      };

      const result = await service.getDashboard(company.id, ownActor);

      expect(vehiclesService.countActive).toHaveBeenCalledWith(company.id);
      expect(result.veiculos).toBe(3);
    });
  });

  describe("suspend / reactivate", () => {
    it("rejeita suspender uma empresa já cancelada", async () => {
      companyRepository.findById.mockResolvedValue(
        buildCompany({ status: CompanyStatus.CANCELADO }),
      );
      await expect(service.suspend("company-1", { motivo: "x" }, adminActor, {})).rejects.toThrow(
        BadRequestException,
      );
    });

    it("rejeita reativar uma empresa que não está suspensa", async () => {
      companyRepository.findById.mockResolvedValue(buildCompany({ status: CompanyStatus.ATIVO }));
      await expect(service.reactivate("company-1", adminActor, {})).rejects.toThrow(
        BadRequestException,
      );
    });

    it("suspende uma empresa ativa com sucesso", async () => {
      companyRepository.findById.mockResolvedValue(buildCompany({ status: CompanyStatus.ATIVO }));
      companyRepository.update.mockResolvedValue(buildCompany({ status: CompanyStatus.SUSPENSO }));

      const result = await service.suspend(
        "company-1",
        { motivo: "Inadimplência" },
        adminActor,
        {},
      );
      expect(result.status).toBe(CompanyStatus.SUSPENSO);
      expect(auditLogService.record).toHaveBeenCalledWith(
        expect.objectContaining({ acao: "SUSPENDED" }),
      );
    });
  });

  describe("changePlan", () => {
    it("rejeita trocar para o mesmo plano já ativo", async () => {
      companyRepository.findById.mockResolvedValue(buildCompany());
      planRepository.findByCode.mockResolvedValue(STARTER_PLAN);

      await expect(
        service.changePlan("company-1", { planCode: "STARTER" }, adminActor, {}),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe("update", () => {
    it("marca a auditoria como ADDRESS_CHANGED quando só campos de endereço mudam", async () => {
      const existing = buildCompany();
      companyRepository.findById.mockResolvedValue(existing);
      companyRepository.update.mockResolvedValue(buildCompany({ cidade: "Campinas" }));

      await service.update("company-1", { cidade: "Campinas" }, adminActor, {});

      expect(auditLogService.record).toHaveBeenCalledWith(
        expect.objectContaining({ acao: "ADDRESS_CHANGED" }),
      );
    });

    it("marca a auditoria como UPDATED quando outros campos também mudam", async () => {
      const existing = buildCompany();
      companyRepository.findById.mockResolvedValue(existing);
      companyRepository.update.mockResolvedValue(buildCompany({ nomeFantasia: "Novo Nome" }));

      await service.update("company-1", { nomeFantasia: "Novo Nome" }, adminActor, {});

      expect(auditLogService.record).toHaveBeenCalledWith(
        expect.objectContaining({ acao: "UPDATED" }),
      );
    });

    it("não chama o repositório quando não há campos alterados", async () => {
      companyRepository.findById.mockResolvedValue(buildCompany());
      await service.update("company-1", {}, adminActor, {});
      expect(companyRepository.update).not.toHaveBeenCalled();
    });
  });
});
