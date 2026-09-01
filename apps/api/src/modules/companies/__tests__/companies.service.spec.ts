import { BadRequestException, ConflictException, Logger, NotFoundException } from "@nestjs/common";
import { CompanyStatus, CompanyType } from "@prisma/client";

import { CompaniesService } from "../companies.service";

import type { CreateCompanyDto } from "../dto/create-company.dto";
import type { CompanySettingRepository } from "../repositories/company-setting.repository";
import type { CompanyRepository, CompanyWithPlan } from "../repositories/company.repository";
import type { PlanRepository } from "../repositories/plan.repository";
import type { AuthenticatedUser } from "@/common/decorators/current-user.decorator";
import type { PrismaService } from "@/infra/database/prisma.service";
import type { ReceitaFederalService } from "@/infra/receita-federal/receita-federal.service";
import type { SupabaseStorageService } from "@/infra/storage/supabase-storage.service";
import type { AuditLogService } from "@/modules/audit/audit-log.service";
import type { DashboardService } from "@/modules/dashboard/dashboard.service";
import type { MessagePersonalizationService } from "@/modules/notifications/message-personalization.service";
import type { UsersService } from "@/modules/users/users.service";
import type { VehiclesService } from "@/modules/vehicles/vehicles.service";
import type { EventEmitter2 } from "@nestjs/event-emitter";

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
    codigoInterno: "TRN-000001",
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
  let dashboardService: jest.Mocked<DashboardService>;
  let receitaFederalService: jest.Mocked<ReceitaFederalService>;
  let messagePersonalizationService: jest.Mocked<
    Pick<MessagePersonalizationService, "cadastroConcluido" | "novoClienteCadastrado">
  >;
  let eventEmitter: jest.Mocked<Pick<EventEmitter2, "emit">>;

  beforeEach(() => {
    companyRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      findByCpfCnpj: jest.fn(),
      update: jest.fn(),
      list: jest.fn(),
      nextCodigoInternoSequence: jest.fn(),
    };
    settingRepository = { upsertMany: jest.fn(), listByCompany: jest.fn() };
    planRepository = {
      findByCode: jest.fn(),
      findById: jest.fn(),
      listActive: jest.fn(),
      upsertByCode: jest.fn(),
    };
    usersService = {
      findByIdentifier: jest.fn(),
      assertNoDuplicateIdentity: jest.fn(),
      createUserWithPassword: jest.fn(),
      createMembership: jest.fn(),
      listMembershipsByCompany: jest.fn(),
      listAdminRottaUserIds: jest.fn().mockResolvedValue([]),
    } as unknown as jest.Mocked<UsersService>;
    auditLogService = {
      record: jest.fn(),
      listByCompany: jest.fn(),
    } as unknown as jest.Mocked<AuditLogService>;
    storageService = { upload: jest.fn() } as unknown as jest.Mocked<SupabaseStorageService>;
    prisma = {
      runInTenantTransaction: jest.fn((fn: (tx: unknown) => unknown) => fn({})),
      // `CompaniesService.findMatchingPendingSubscription` (Dossiê 26 —
      // "assinar antes de ter conta") — `null` = nenhum pagamento
      // pré-cadastro pendente, mesmo comportamento de sempre pros
      // demais testes deste describe, que não testam esse fluxo.
      pendingSubscription: { findFirst: jest.fn().mockResolvedValue(null) },
    } as unknown as jest.Mocked<PrismaService>;
    vehiclesService = { countActive: jest.fn() } as unknown as jest.Mocked<VehiclesService>;
    dashboardService = {
      getCompanyDashboardById: jest.fn(),
    } as unknown as jest.Mocked<DashboardService>;
    receitaFederalService = {
      lookupCnpj: jest.fn(),
      isAtiva: jest.fn(),
    } as unknown as jest.Mocked<ReceitaFederalService>;
    messagePersonalizationService = {
      cadastroConcluido: jest.fn().mockReturnValue({ titulo: "", corpo: "" }),
      novoClienteCadastrado: jest.fn().mockReturnValue({ titulo: "", corpo: "" }),
    };
    eventEmitter = { emit: jest.fn() };

    service = new CompaniesService(
      companyRepository,
      settingRepository,
      planRepository,
      usersService,
      auditLogService,
      storageService,
      prisma,
      vehiclesService,
      dashboardService,
      receitaFederalService,
      messagePersonalizationService as unknown as MessagePersonalizationService,
      eventEmitter as unknown as EventEmitter2,
    );

    planRepository.findByCode.mockResolvedValue(STARTER_PLAN);
    companyRepository.findByCpfCnpj.mockResolvedValue(null);
    companyRepository.nextCodigoInternoSequence.mockResolvedValue(1);
    usersService.assertNoDuplicateIdentity.mockResolvedValue(undefined);
    // Indisponibilidade "genérica" por padrão (não `NotFoundException`) —
    // cai no caminho de degradação graciosa (`resolveDadosCadastrais`),
    // preservando os dados do `dto` como sempre foi, pra não quebrar os
    // testes de `create` que já existiam antes da Receita Federal entrar
    // em cena. Os testes da Frente B (abaixo) sobrescrevem isso.
    receitaFederalService.lookupCnpj.mockRejectedValue(new Error("BrasilAPI indisponível"));
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

    describe("confirmação de CNPJ na Receita Federal (Frente B)", () => {
      const receitaAtiva = {
        cnpj: "11222333000181",
        razaoSocial: "TRANSPORTES ROTTA LTDA (RECEITA FEDERAL)",
        nomeFantasia: "ROTTA (RECEITA FEDERAL)",
        situacaoCadastral: "ATIVA",
        cep: "01310200",
        endereco: "Rua da Receita Federal",
        numero: "500",
        complemento: "Sala 9",
        bairro: "Bairro da Receita",
        cidade: "São Paulo",
        estado: "SP",
      };

      it("sobrescreve razão social e endereço com os dados da Receita Federal — nunca os que o cliente enviou", async () => {
        receitaFederalService.lookupCnpj.mockResolvedValue(receitaAtiva);
        receitaFederalService.isAtiva.mockReturnValue(true);
        companyRepository.create.mockResolvedValue(buildCompany());
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

        const dto = buildCreateDto({
          nomeFantasia: "Nome que o cliente escolheu",
          razaoSocial: "Razão social que o cliente tentou mandar",
          endereco: "Endereço que o cliente tentou mandar",
        });
        await service.create(dto, adminActor, {});

        expect(receitaFederalService.lookupCnpj).toHaveBeenCalledWith("11222333000181");
        expect(companyRepository.create).toHaveBeenCalledWith(
          expect.objectContaining({
            razaoSocial: receitaAtiva.razaoSocial,
            endereco: receitaAtiva.endereco,
            numero: receitaAtiva.numero,
            bairro: receitaAtiva.bairro,
            cidade: receitaAtiva.cidade,
            estado: receitaAtiva.estado,
            // nomeFantasia é o ÚNICO campo que continua vindo do cliente.
            nomeFantasia: "Nome que o cliente escolheu",
          }),
          expect.anything(),
        );
      });

      it("rejeita CNPJ com situação cadastral diferente de ATIVA", async () => {
        receitaFederalService.lookupCnpj.mockResolvedValue({
          ...receitaAtiva,
          situacaoCadastral: "BAIXADA",
        });
        receitaFederalService.isAtiva.mockReturnValue(false);

        await expect(service.create(buildCreateDto(), adminActor, {})).rejects.toThrow(
          BadRequestException,
        );
        expect(companyRepository.create).not.toHaveBeenCalled();
      });

      it("rejeita CNPJ não encontrado na Receita Federal", async () => {
        receitaFederalService.lookupCnpj.mockRejectedValue(
          new NotFoundException("CNPJ não encontrado."),
        );

        await expect(service.create(buildCreateDto(), adminActor, {})).rejects.toThrow(
          BadRequestException,
        );
      });

      it("segue com os dados do cliente (sem travar) quando a BrasilAPI está indisponível", async () => {
        receitaFederalService.lookupCnpj.mockRejectedValue(new Error("timeout"));
        companyRepository.create.mockResolvedValue(buildCompany());
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

        const dto = buildCreateDto({ razaoSocial: "Razão social enviada pelo cliente" });
        await expect(service.create(dto, adminActor, {})).resolves.toBeDefined();
        expect(companyRepository.create).toHaveBeenCalledWith(
          expect.objectContaining({ razaoSocial: "Razão social enviada pelo cliente" }),
          expect.anything(),
        );
      });

      it("nunca consulta a Receita Federal para motorista autônomo (CPF, não CNPJ)", async () => {
        companyRepository.create.mockResolvedValue(buildCompany());
        usersService.createUserWithPassword.mockResolvedValue({
          id: "user-1",
          nome: "João",
          email: "joao@rotta.com.br",
          telefone: "11911112222",
          cpf: "11144477735",
          passwordHash: "hash",
          status: "ATIVO",
          avatarUrl: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
        });

        const dto = buildCreateDto({
          tipo: CompanyType.AUTONOMO,
          cpfCnpj: "11144477735",
          administrador: {
            nome: "João",
            email: "joao@rotta.com.br",
            telefone: "11911112222",
            cpf: "11144477735",
            senha: "SenhaForte123",
          },
        });
        await service.create(dto, adminActor, {});

        expect(receitaFederalService.lookupCnpj).not.toHaveBeenCalled();
      });
    });
  });

  describe("onModuleInit", () => {
    it("autoprovisiona o plano padrão quando não há nenhum Plano ativo no catálogo", async () => {
      const warnSpy = jest.spyOn(Logger.prototype, "warn").mockImplementation();
      planRepository.listActive.mockResolvedValue([]);

      await service.onModuleInit();

      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("Nenhum Plano ativo"));
      expect(planRepository.upsertByCode).toHaveBeenCalledWith(
        expect.objectContaining({ code: "STARTER", priceCents: 3990, isActive: true }),
      );
      warnSpy.mockRestore();
    });

    it("não provisiona nada quando já há ao menos um Plano ativo", async () => {
      planRepository.listActive.mockResolvedValue([STARTER_PLAN]);

      await service.onModuleInit();

      expect(planRepository.upsertByCode).not.toHaveBeenCalled();
    });

    it("nunca lança — só loga um aviso — quando a verificação falha (ex. banco indisponível no boot)", async () => {
      const warnSpy = jest.spyOn(Logger.prototype, "warn").mockImplementation();
      planRepository.listActive.mockRejectedValue(new Error("conexão recusada"));

      await expect(service.onModuleInit()).resolves.toBeUndefined();
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("conexão recusada"));
      warnSpy.mockRestore();
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
    const ownActor: AuthenticatedUser = {
      sub: "u1",
      tenantId: "company-1",
      role: Role.EMPRESA,
      vinculoId: "v1",
    };

    function buildAgregado(overrides: Partial<ReturnType<typeof baseAgregado>> = {}) {
      return { ...baseAgregado(), ...overrides };
    }
    function baseAgregado() {
      return {
        rotasAtivas: 5,
        rotasTotal: 8,
        viagensHoje: { total: 6, emAndamento: 2, concluidas: 4, canceladas: 0 },
        motoristasAtivos: 0,
        monitoresAtivos: 0,
        veiculosTotal: 0,
        alunosAtivos: 25,
        chamadosAbertos: 0,
        documentosVencendoEm7Dias: { motorista: 0, veiculo: 0 },
        receitaEstimadaCentavos: 125_000,
        contratosAtivos: 25,
      };
    }

    it("reflete a contagem real de veículos ativos (nunca hardcoded em zero)", async () => {
      const company = buildCompany();
      companyRepository.findById.mockResolvedValue(company);
      usersService.listMembershipsByCompany.mockResolvedValue([]);
      vehiclesService.countActive.mockResolvedValue(3);
      dashboardService.getCompanyDashboardById.mockResolvedValue(buildAgregado());

      const result = await service.getDashboard(company.id, ownActor);

      expect(vehiclesService.countActive).toHaveBeenCalledWith(company.id);
      expect(result.veiculos).toBe(3);
    });

    it("completa alunos/rotas/viagens/receita a partir de DashboardService.getCompanyDashboardById (nunca hardcoded em zero)", async () => {
      const company = buildCompany();
      companyRepository.findById.mockResolvedValue(company);
      usersService.listMembershipsByCompany.mockResolvedValue([]);
      vehiclesService.countActive.mockResolvedValue(0);
      dashboardService.getCompanyDashboardById.mockResolvedValue(buildAgregado());

      const result = await service.getDashboard(company.id, ownActor);

      expect(dashboardService.getCompanyDashboardById).toHaveBeenCalledWith(company.id);
      expect(result.alunos).toBe(25);
      expect(result.rotas).toBe(8);
      expect(result.viagens).toBe(6);
      expect(result.receitaEstimadaCentavos).toBe(125_000);
    });

    it("gera alertas reais a partir de chamados abertos e documentos vencendo, nunca uma lista fixa vazia", async () => {
      const company = buildCompany();
      companyRepository.findById.mockResolvedValue(company);
      usersService.listMembershipsByCompany.mockResolvedValue([]);
      vehiclesService.countActive.mockResolvedValue(0);
      dashboardService.getCompanyDashboardById.mockResolvedValue(
        buildAgregado({
          chamadosAbertos: 2,
          documentosVencendoEm7Dias: { motorista: 1, veiculo: 3 },
        }),
      );

      const result = await service.getDashboard(company.id, ownActor);

      expect(result.documentosVencendo).toBe(4);
      expect(result.alertas).toEqual([
        "2 chamado(s) de suporte aberto(s).",
        "4 documento(s) vencendo nos próximos 7 dias.",
      ]);
    });

    it("retorna alertas vazios quando não há chamados abertos nem documentos vencendo", async () => {
      const company = buildCompany();
      companyRepository.findById.mockResolvedValue(company);
      usersService.listMembershipsByCompany.mockResolvedValue([]);
      vehiclesService.countActive.mockResolvedValue(0);
      dashboardService.getCompanyDashboardById.mockResolvedValue(buildAgregado());

      const result = await service.getDashboard(company.id, ownActor);

      expect(result.alertas).toEqual([]);
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
