import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  type OnModuleInit,
} from "@nestjs/common";
import { CompanyStatus, CompanyType, MembershipStatus } from "@prisma/client";

import {
  COMPANY_REPOSITORY,
  COMPANY_SETTING_REPOSITORY,
  DEFAULT_PLAN,
  PLAN_REPOSITORY,
  TRIAL_DURATION_MONTHS,
} from "./companies.constants";
import { toCompanyResponseDto } from "./mappers/company.mapper";

import type { ChangePlanDto } from "./dto/change-plan.dto";
import type { CompanyDashboardResponseDto } from "./dto/company-dashboard-response.dto";
import type { CompanyResponseDto, ListCompaniesResponseDto } from "./dto/company-response.dto";
import type { CreateCompanyDto } from "./dto/create-company.dto";
import type { ListCompaniesQueryDto } from "./dto/list-companies-query.dto";
import type { SuspendCompanyDto } from "./dto/suspend-company.dto";
import type {
  NotificationChannel,
  UpdateCompanySettingsDto,
} from "./dto/update-company-settings.dto";
import type { UpdateCompanyDto } from "./dto/update-company.dto";
import type { CompanySettingRepository } from "./repositories/company-setting.repository";
import type { CompanyRepository, UpdateCompanyData } from "./repositories/company.repository";
import type { PlanRepository } from "./repositories/plan.repository";
import type { AuthenticatedUser } from "@/common/decorators/current-user.decorator";
import type {
  AuditLogResponseDto,
  ListAuditLogsResponseDto,
} from "@/common/dto/audit-log-response.dto";
import type { RecordAuditLogInput } from "@/modules/audit/repositories/audit-log.repository";

import { PrismaService } from "@/infra/database/prisma.service";
import {
  type ReceitaFederalCompanyData,
  ReceitaFederalService,
} from "@/infra/receita-federal/receita-federal.service";
import { SupabaseStorageService } from "@/infra/storage/supabase-storage.service";
import { AuditLogService } from "@/modules/audit/audit-log.service";
import { DashboardService } from "@/modules/dashboard/dashboard.service";
import { UsersService } from "@/modules/users/users.service";
import { VehiclesService } from "@/modules/vehicles/vehicles.service";
import { Role } from "@/shared/enums";

export interface RequestMeta {
  ip?: string;
  userAgent?: string;
}

const ADDRESS_FIELDS = new Set([
  "cep",
  "endereco",
  "numero",
  "complemento",
  "bairro",
  "cidade",
  "estado",
  "latitude",
  "longitude",
]);

function onlyDigits(value: string): string {
  return value.replace(/\D/g, "");
}

function pick<T extends object, K extends keyof T>(source: T, keys: K[]): Partial<T> {
  const result: Partial<T> = {};
  for (const key of keys) {
    result[key] = source[key];
  }
  return result;
}

/**
 * Núcleo de negócio do módulo Empresas (Dossiê 16). Nunca executa uma
 * query diretamente — sempre via `CompanyRepository`/`PlanRepository`/
 * `CompanySettingRepository` (Repository Pattern, Dossiê 12 Seção 6.1) —
 * e delega identidade/vínculo a `UsersService` (nunca duplica a lógica
 * de criação de usuário aqui). A única exceção é `PrismaService`,
 * injetado apenas para abrir a transação de `create()` via
 * `runInTenantTransaction` — o `tx` resultante ainda é repassado para
 * cada repositório fazer sua própria escrita, nunca uma query solta
 * escrita aqui.
 */
@Injectable()
export class CompaniesService implements OnModuleInit {
  private readonly logger = new Logger(CompaniesService.name);

  constructor(
    @Inject(COMPANY_REPOSITORY) private readonly companyRepository: CompanyRepository,
    @Inject(COMPANY_SETTING_REPOSITORY)
    private readonly settingRepository: CompanySettingRepository,
    @Inject(PLAN_REPOSITORY) private readonly planRepository: PlanRepository,
    private readonly usersService: UsersService,
    private readonly auditLogService: AuditLogService,
    private readonly storageService: SupabaseStorageService,
    private readonly prisma: PrismaService,
    private readonly vehiclesService: VehiclesService,
    private readonly dashboardService: DashboardService,
    private readonly receitaFederalService: ReceitaFederalService,
  ) {}

  /**
   * Autocura de boot para o exato bug já encontrado uma vez em produção
   * (comentário em `.github/workflows/ci.yml`, seção de testes E2E):
   * "cadastro de Empresa falha porque o plano STARTER nunca foi
   * inserido" — silencioso até um usuário real tentar se cadastrar
   * (`register()`/`create()` abaixo chamam `resolvePlanOrThrow` e
   * recebem um 404 sem contexto nenhum de causa). Sem nenhum plano
   * ativo no catálogo, TODO cadastro self-service de Empresa/motorista
   * autônomo falhava — isso nunca deveria depender de alguém lembrar de
   * rodar `prisma/seed.ts` manualmente contra produção. `DEFAULT_PLAN`
   * (R$ 39,90/mês) não é mais um valor inventado aqui: é o único plano
   * do produto hoje, confirmado pelo usuário e já publicado na página
   * `/planos` — autoprovisionar o catálogo com exatamente esse valor
   * garante que "criar conta" nunca falha por falta de seed, sem
   * inventar preço/condições novas.
   */
  async onModuleInit(): Promise<void> {
    // `try/catch` de propósito: uma falha aqui (ex. banco ainda não
    // aceitando conexões no exato instante do boot) nunca deve derrubar
    // a aplicação inteira — só fica sem o catálogo até o próximo boot.
    try {
      const activePlans = await this.planRepository.listActive();
      if (activePlans.length === 0) {
        this.logger.warn(
          `Nenhum Plano ativo no catálogo — provisionando "${DEFAULT_PLAN.code}" ` +
            "automaticamente para não bloquear o cadastro self-service.",
        );
        await this.planRepository.upsertByCode({ ...DEFAULT_PLAN, isActive: true });
      }
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `Não foi possível verificar/provisionar o catálogo de Planos no boot: ${reason}`,
      );
    }
  }

  /**
   * Só `Role.ADMIN_ROTTA` acessa qualquer empresa; os demais papéis só
   * acessam a própria (`actor.tenantId`). `NotFoundException` (nunca
   * `ForbiddenException`) para não confirmar a existência de uma
   * empresa de outro tenant a quem não tem acesso a ela (mesmo
   * princípio de não-enumeração do Dossiê 12 §7.4).
   */
  private assertCanAccessCompany(companyId: string, actor: AuthenticatedUser): void {
    if (actor.role !== Role.ADMIN_ROTTA && actor.tenantId !== companyId) {
      throw new NotFoundException("Empresa não encontrada.");
    }
  }

  /**
   * Prévia pública da consulta de CNPJ (`GET /companies/cnpj/:cnpj`) —
   * usada pelo formulário de cadastro (`useCnpjLookup`, web/mobile via
   * WebView) pra mostrar/travar os campos ANTES de enviar. Só um espelho
   * de leitura de `ReceitaFederalService.lookupCnpj`; a confirmação que
   * realmente vale é a que `resolveDadosCadastrais` faz de novo dentro
   * de `create()` — nunca confia no que esta rota devolveu antes.
   */
  async previewCnpj(cnpjDigits: string): Promise<{
    cnpj: string;
    razaoSocial: string;
    nomeFantasiaSugerido: string;
    situacaoCadastral: string;
    ativa: boolean;
    cep: string;
    endereco: string;
    numero: string;
    complemento: string | null;
    bairro: string;
    cidade: string;
    estado: string;
  }> {
    const receita = await this.receitaFederalService.lookupCnpj(cnpjDigits);
    return {
      cnpj: receita.cnpj,
      razaoSocial: receita.razaoSocial,
      nomeFantasiaSugerido: receita.nomeFantasia,
      situacaoCadastral: receita.situacaoCadastral,
      ativa: this.receitaFederalService.isAtiva(receita),
      cep: receita.cep,
      endereco: receita.endereco,
      numero: receita.numero,
      complemento: receita.complemento,
      bairro: receita.bairro,
      cidade: receita.cidade,
      estado: receita.estado,
    };
  }

  private async resolvePlanOrThrow(planCode: string) {
    const plan = await this.planRepository.findByCode(planCode);
    if (!plan) {
      throw new NotFoundException(`Plano "${planCode}" não encontrado.`);
    }
    return plan;
  }

  /** Frente M — mesmo padrão de `SchoolsService.generateCodigoInterno`, prefixo `TRN` (transportadora). */
  private async generateCodigoInterno(): Promise<string> {
    const sequence = await this.companyRepository.nextCodigoInternoSequence();
    return `TRN-${String(sequence).padStart(6, "0")}`;
  }

  /**
   * Confirma o CNPJ na Receita Federal (BrasilAPI, `ReceitaFederalService`
   * — pedido do usuário: "fazer uma busca na Receita Federal, ver se
   * está ativo e colocar no cadastro, não podendo alterar os dados").
   * Razão social e endereço vêm DAQUI quando a consulta funciona — nunca
   * do que o cliente enviou —, então não tem como burlar mandando outro
   * endereço direto na requisição. `nomeFantasia` nunca é tocado aqui: é
   * o único campo que o usuário pode escolher, mesmo com CNPJ confirmado.
   *
   * `AUTONOMO` usa CPF (pessoa física, sem CNPJ) — não há o que
   * consultar, mantém os dados enviados como sempre foi.
   *
   * Situação cadastral diferente de ATIVA e CNPJ não encontrado BLOQUEIAM
   * o cadastro (é exatamente o que foi pedido). Já uma falha de rede/
   * timeout da BrasilAPI NÃO bloqueia — mesma disciplina de "nunca cair
   * o cadastro por causa de um serviço de terceiro instável" do resto do
   * projeto —, só loga o aviso e segue com os dados que o cliente enviou,
   * sem a trava de imutabilidade (o cliente não tem culpa da BrasilAPI
   * estar fora do ar).
   */
  private async resolveDadosCadastrais(
    dto: CreateCompanyDto,
    cpfCnpjDigits: string,
  ): Promise<{
    razaoSocial: string;
    cep: string;
    endereco: string;
    numero: string;
    complemento?: string;
    bairro: string;
    cidade: string;
    estado: string;
  }> {
    const dadosDoCliente = {
      razaoSocial: dto.razaoSocial,
      cep: dto.cep,
      endereco: dto.endereco,
      numero: dto.numero,
      complemento: dto.complemento,
      bairro: dto.bairro,
      cidade: dto.cidade,
      estado: dto.estado,
    };

    if (dto.tipo === CompanyType.AUTONOMO) {
      return dadosDoCliente;
    }

    let receita: ReceitaFederalCompanyData;
    try {
      receita = await this.receitaFederalService.lookupCnpj(cpfCnpjDigits);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw new BadRequestException(
          "CNPJ não encontrado na Receita Federal. Confira o número informado.",
        );
      }
      this.logger.warn(
        `Consulta de CNPJ ${cpfCnpjDigits} na Receita Federal indisponível — seguindo com os dados enviados pelo cliente, sem confirmação. ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return dadosDoCliente;
    }

    if (!this.receitaFederalService.isAtiva(receita)) {
      throw new BadRequestException(
        `Este CNPJ está com situação cadastral "${receita.situacaoCadastral}" na Receita Federal — só é possível cadastrar empresas com situação ATIVA.`,
      );
    }

    return {
      razaoSocial: receita.razaoSocial,
      cep: receita.cep || dadosDoCliente.cep,
      endereco: receita.endereco || dadosDoCliente.endereco,
      numero: receita.numero || dadosDoCliente.numero,
      complemento: receita.complemento ?? dadosDoCliente.complemento,
      bairro: receita.bairro || dadosDoCliente.bairro,
      cidade: receita.cidade || dadosDoCliente.cidade,
      estado: receita.estado || dadosDoCliente.estado,
    };
  }

  async create(
    dto: CreateCompanyDto,
    actor: AuthenticatedUser,
    meta: RequestMeta,
  ): Promise<CompanyResponseDto> {
    const cpfCnpjDigits = onlyDigits(dto.cpfCnpj);
    const adminCpfDigits = onlyDigits(dto.administrador.cpf);
    const adminTelefoneDigits = onlyDigits(dto.administrador.telefone);

    if (dto.tipo === CompanyType.AUTONOMO) {
      if (cpfCnpjDigits.length !== 11) {
        throw new BadRequestException(
          "Motorista autônomo deve informar CPF (11 dígitos) em cpfCnpj.",
        );
      }
      if (cpfCnpjDigits !== adminCpfDigits) {
        throw new BadRequestException(
          "Para motorista autônomo, o CPF da empresa (cpfCnpj) deve ser o mesmo do administrador.",
        );
      }
    } else if (cpfCnpjDigits.length !== 14) {
      throw new BadRequestException("Este tipo de empresa exige CNPJ (14 dígitos) em cpfCnpj.");
    }

    const existingCompany = await this.companyRepository.findByCpfCnpj(cpfCnpjDigits);
    if (existingCompany) {
      throw new ConflictException("Já existe uma empresa cadastrada com este CPF/CNPJ.");
    }

    const dadosCadastrais = await this.resolveDadosCadastrais(dto, cpfCnpjDigits);

    const adminEmail = dto.administrador.email.trim().toLowerCase();
    await this.usersService.assertNoDuplicateIdentity(
      adminEmail,
      adminTelefoneDigits,
      adminCpfDigits,
    );

    const plan = await this.resolvePlanOrThrow(dto.planCode ?? DEFAULT_PLAN.code);
    const codigoInterno = await this.generateCodigoInterno();

    // Toda empresa criada por este método nasce em `TRIAL` (nenhum
    // `status` é passado no payload abaixo — usa o default do schema),
    // então sempre ganha um prazo real de trial (1 mês, pedido do
    // usuário/faturamento). Antes desta mudança, `trialExpiraEm` nunca
    // era preenchido em lugar nenhum (achado da investigação) — toda
    // empresa ficava em TRIAL pra sempre, sem vencimento nenhum.
    const trialExpiraEm = new Date();
    trialExpiraEm.setMonth(trialExpiraEm.getMonth() + TRIAL_DURATION_MONTHS);

    // Company + User (administrador) + Membership são uma única unidade
    // de negócio (Dossiê 16: "motorista autônomo automaticamente vira
    // Administrador da empresa") — atômicos via uma única transação
    // (`runInTenantTransaction`), nunca 3 escritas independentes: uma
    // falha a meio caminho (ex. e-mail duplicado detectado só no
    // `unique` do banco por uma corrida de requisições) já deixou, na
    // primeira versão desta função, uma `Company` órfã sem
    // administrador — bug real encontrado e corrigido durante este
    // módulo, testando o fluxo de cadastro ponta a ponta.
    const { company, adminUser } = await this.prisma.runInTenantTransaction(async (tx) => {
      const createdCompany = await this.companyRepository.create(
        {
          codigoInterno,
          razaoSocial: dadosCadastrais.razaoSocial,
          // `nomeFantasia` é o ÚNICO campo que o próprio usuário controla
          // quando o CNPJ foi confirmado na Receita Federal (pedido
          // explícito: "não podendo alterar os dados, apenas possível
          // alterar o nome fantasia") — é o nome que aparece na Rotta.
          nomeFantasia: dto.nomeFantasia,
          cpfCnpj: cpfCnpjDigits,
          tipo: dto.tipo,
          email: dto.email.trim().toLowerCase(),
          telefone: onlyDigits(dto.telefone),
          whatsapp: dto.whatsapp ? onlyDigits(dto.whatsapp) : undefined,
          cep: onlyDigits(dadosCadastrais.cep),
          endereco: dadosCadastrais.endereco,
          numero: dadosCadastrais.numero,
          complemento: dadosCadastrais.complemento,
          bairro: dadosCadastrais.bairro,
          cidade: dadosCadastrais.cidade,
          estado: dadosCadastrais.estado.toUpperCase(),
          latitude: dto.latitude,
          longitude: dto.longitude,
          corPrimaria: dto.corPrimaria,
          idioma: dto.idioma,
          fusoHorario: dto.fusoHorario,
          planId: plan.id,
          trialExpiraEm,
        },
        tx,
      );

      const createdAdminUser = await this.usersService.createUserWithPassword(
        {
          nome: dto.administrador.nome,
          email: adminEmail,
          telefone: adminTelefoneDigits,
          cpf: adminCpfDigits,
          senha: dto.administrador.senha,
        },
        tx,
      );

      await this.usersService.createMembership(
        { userId: createdAdminUser.id, companyId: createdCompany.id, role: Role.EMPRESA },
        tx,
      );

      return { company: createdCompany, adminUser: createdAdminUser };
    });

    await this.recordAudit({
      companyId: company.id,
      entidadeTipo: "Company",
      entidadeId: company.id,
      acao: "CREATED",
      atorUserId: actor.role === Role.ADMIN_ROTTA ? actor.sub : adminUser.id,
      dadosDepois: {
        nomeFantasia: company.nomeFantasia,
        tipo: company.tipo,
        status: company.status,
      },
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return toCompanyResponseDto(company);
  }

  async findByIdOrThrow(id: string, actor: AuthenticatedUser): Promise<CompanyResponseDto> {
    this.assertCanAccessCompany(id, actor);
    const company = await this.companyRepository.findById(id);
    if (!company) {
      throw new NotFoundException("Empresa não encontrada.");
    }
    return toCompanyResponseDto(company);
  }

  async list(query: ListCompaniesQueryDto): Promise<ListCompaniesResponseDto> {
    const { items, total } = await this.companyRepository.list({
      search: query.search,
      status: query.status,
      tipo: query.tipo,
      page: query.page,
      pageSize: query.pageSize,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
    });

    return {
      items: items.map(toCompanyResponseDto),
      total,
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  async update(
    id: string,
    dto: UpdateCompanyDto,
    actor: AuthenticatedUser,
    meta: RequestMeta,
  ): Promise<CompanyResponseDto> {
    this.assertCanAccessCompany(id, actor);
    const existing = await this.companyRepository.findById(id);
    if (!existing) {
      throw new NotFoundException("Empresa não encontrada.");
    }

    const changedKeys = (Object.keys(dto) as (keyof UpdateCompanyDto)[]).filter(
      (key) => dto[key] !== undefined,
    );

    if (changedKeys.length === 0) {
      return toCompanyResponseDto(existing);
    }

    const data: UpdateCompanyData = { ...dto };
    if (dto.telefone) data.telefone = onlyDigits(dto.telefone);
    if (dto.whatsapp) data.whatsapp = onlyDigits(dto.whatsapp);
    if (dto.cep) data.cep = onlyDigits(dto.cep);
    if (dto.estado) data.estado = dto.estado.toUpperCase();
    if (dto.email) data.email = dto.email.trim().toLowerCase();

    const updated = await this.companyRepository.update(id, data);

    const isAddressOnly = changedKeys.every((key) => ADDRESS_FIELDS.has(key));
    const acao = isAddressOnly ? "ADDRESS_CHANGED" : "UPDATED";

    await this.recordAudit({
      companyId: id,
      entidadeTipo: "Company",
      entidadeId: id,
      acao,
      atorUserId: actor.sub,
      dadosAntes: pick(existing, changedKeys as (keyof typeof existing)[]),
      dadosDepois: pick(updated, changedKeys as (keyof typeof updated)[]),
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return toCompanyResponseDto(updated);
  }

  /** Soft delete (Dossiê 16, "Excluir Empresa") — apenas Admin Rotta (garantido pelo controller). */
  async remove(id: string, actor: AuthenticatedUser, meta: RequestMeta): Promise<void> {
    const existing = await this.companyRepository.findById(id);
    if (!existing) {
      throw new NotFoundException("Empresa não encontrada.");
    }

    await this.companyRepository.update(id, { deletedAt: new Date() });

    await this.recordAudit({
      companyId: id,
      entidadeTipo: "Company",
      entidadeId: id,
      acao: "DELETED",
      atorUserId: actor.sub,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });
  }

  async suspend(
    id: string,
    dto: SuspendCompanyDto,
    actor: AuthenticatedUser,
    meta: RequestMeta,
  ): Promise<CompanyResponseDto> {
    const existing = await this.companyRepository.findById(id);
    if (!existing) {
      throw new NotFoundException("Empresa não encontrada.");
    }
    if (existing.status === CompanyStatus.CANCELADO) {
      throw new BadRequestException("Uma empresa cancelada não pode ser suspensa.");
    }

    const updated = await this.companyRepository.update(id, { status: CompanyStatus.SUSPENSO });

    await this.recordAudit({
      companyId: id,
      entidadeTipo: "Company",
      entidadeId: id,
      acao: "SUSPENDED",
      atorUserId: actor.sub,
      dadosAntes: { status: existing.status },
      dadosDepois: { status: updated.status, motivo: dto.motivo },
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return toCompanyResponseDto(updated);
  }

  async reactivate(
    id: string,
    actor: AuthenticatedUser,
    meta: RequestMeta,
  ): Promise<CompanyResponseDto> {
    const existing = await this.companyRepository.findById(id);
    if (!existing) {
      throw new NotFoundException("Empresa não encontrada.");
    }
    if (existing.status !== CompanyStatus.SUSPENSO) {
      throw new BadRequestException("Apenas empresas suspensas podem ser reativadas.");
    }

    const updated = await this.companyRepository.update(id, { status: CompanyStatus.ATIVO });

    await this.recordAudit({
      companyId: id,
      entidadeTipo: "Company",
      entidadeId: id,
      acao: "REACTIVATED",
      atorUserId: actor.sub,
      dadosAntes: { status: existing.status },
      dadosDepois: { status: updated.status },
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return toCompanyResponseDto(updated);
  }

  async changePlan(
    id: string,
    dto: ChangePlanDto,
    actor: AuthenticatedUser,
    meta: RequestMeta,
  ): Promise<CompanyResponseDto> {
    this.assertCanAccessCompany(id, actor);
    const existing = await this.companyRepository.findById(id);
    if (!existing) {
      throw new NotFoundException("Empresa não encontrada.");
    }

    const newPlan = await this.resolvePlanOrThrow(dto.planCode);
    if (newPlan.id === existing.planId) {
      throw new BadRequestException("A empresa já está neste plano.");
    }

    const updated = await this.companyRepository.update(id, { planId: newPlan.id });

    await this.recordAudit({
      companyId: id,
      entidadeTipo: "Company",
      entidadeId: id,
      acao: "PLAN_CHANGED",
      atorUserId: actor.sub,
      dadosAntes: { planCode: existing.plan.code },
      dadosDepois: { planCode: newPlan.code },
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return toCompanyResponseDto(updated);
  }

  /**
   * Completo desde o Prompt 22 (Dossiê 30 §3.1) — até então, `alunos`/
   * `rotas`/`viagens`/`documentosVencendo`/`alertas` ficavam hardcoded
   * em `0`/`[]` porque os módulos que os alimentariam (Routes, Trips,
   * Marketplace/Contract, Documents) ainda não existiam (ver o
   * comentário histórico que ficava em `CompanyDashboardResponseDto`).
   * Agora existem, então este método REUSA a mesma agregação que
   * `DashboardModule` já expõe para Motorista/Monitor/Responsável
   * (`DashboardService.getCompanyDashboardById`) — nunca uma segunda
   * implementação da mesma contagem. `receitaEstimadaCentavos` também
   * foi corrigido aqui: antes lia `company.plan.priceCents` (o que a
   * EMPRESA paga a Rotta pela assinatura — Dossiê 28 §6.7), que não é
   * "receita estimada" nenhuma; agora é a soma real de
   * `Contract.valorMensalidadeCentavos` dos contratos `ATIVO` (`DASH-03`).
   */
  async getDashboard(id: string, actor: AuthenticatedUser): Promise<CompanyDashboardResponseDto> {
    this.assertCanAccessCompany(id, actor);
    const company = await this.companyRepository.findById(id);
    if (!company) {
      throw new NotFoundException("Empresa não encontrada.");
    }

    const [memberships, agregado] = await Promise.all([
      this.usersService.listMembershipsByCompany(id),
      this.dashboardService.getCompanyDashboardById(id),
    ]);
    const isActive = (role: Role): number =>
      memberships.filter((m) => (m.role as Role) === role && m.status === MembershipStatus.ATIVO)
        .length;

    const alertas: string[] = [];
    if (agregado.chamadosAbertos > 0) {
      alertas.push(`${agregado.chamadosAbertos} chamado(s) de suporte aberto(s).`);
    }
    const documentosVencendo =
      agregado.documentosVencendoEm7Dias.motorista + agregado.documentosVencendoEm7Dias.veiculo;
    if (documentosVencendo > 0) {
      alertas.push(`${documentosVencendo} documento(s) vencendo nos próximos 7 dias.`);
    }

    return {
      motoristas: isActive(Role.MOTORISTA),
      responsaveis: isActive(Role.RESPONSAVEL),
      alunos: agregado.alunosAtivos,
      veiculos: await this.vehiclesService.countActive(id),
      rotas: agregado.rotasTotal,
      viagens: agregado.viagensHoje.total,
      receitaEstimadaCentavos: agregado.receitaEstimadaCentavos,
      documentosVencendo,
      alertas,
    };
  }

  async getSettings(id: string, actor: AuthenticatedUser): Promise<UpdateCompanySettingsDto> {
    this.assertCanAccessCompany(id, actor);
    const rows = await this.settingRepository.listByCompany(id);
    const byKey = new Map(rows.map((row) => [row.chave, row.valor]));

    return {
      tema: byKey.has("tema") ? (JSON.parse(byKey.get("tema")!) as "dark" | "light") : "dark",
      canaisNotificacao: byKey.has("canaisNotificacao")
        ? (JSON.parse(byKey.get("canaisNotificacao")!) as NotificationChannel[])
        : ["push"],
      integracoes: byKey.has("integracoes")
        ? (JSON.parse(byKey.get("integracoes")!) as Record<string, boolean>)
        : {},
    };
  }

  /**
   * Leitura interna (sem RBAC de ator humano) do teto de canais
   * habilitados pela EMPRESA (briefing "ROTTA COMMUNICATION ENGINE" —
   * `CompanySetting.canaisNotificacao`); o `NotificationsService` aplica
   * por cima a preferência de cada USUÁRIO (`NotificationPreference`),
   * nunca o contrário. Chamado apenas pelo Communication Engine, que já
   * conhece o `companyId` de uma `Notification` legitimamente associada
   * a essa empresa — nunca a partir de um parâmetro não verificado de
   * cliente. `runWithTenantContext` (bypass) é necessário porque esta
   * chamada acontece fora do ciclo Guard→Interceptor de uma requisição
   * HTTP (ex. um evento de domínio disparando uma notificação em
   * background), então não há `TenantContext` na `AsyncLocalStorage`
   * para `withTenant` resolver.
   */
  getEnabledChannels(companyId: string): Promise<NotificationChannel[]> {
    return this.prisma.runWithTenantContext({ tenantId: companyId, bypass: true }, async () => {
      const rows = await this.settingRepository.listByCompany(companyId);
      const raw = rows.find((row) => row.chave === "canaisNotificacao")?.valor;
      return raw ? (JSON.parse(raw) as NotificationChannel[]) : ["push"];
    });
  }

  /**
   * Leitura interna (sem RBAC de ator humano), mesmo padrão e mesmo
   * motivo de `getEnabledChannels`: usada pelo Marketplace
   * (`ContractsService`) só para compor `nomeEmpresa` nas mensagens do
   * Message Personalization AI (`novoContrato`/`contratoAssinado`) antes
   * de emitir `communication.requested` — nunca a partir de um
   * `companyId` não verificado de cliente.
   */
  getNomeFantasia(companyId: string): Promise<string | null> {
    return this.prisma.runWithTenantContext({ tenantId: companyId, bypass: true }, async () => {
      const company = await this.companyRepository.findById(companyId);
      return company?.nomeFantasia ?? null;
    });
  }

  async updateSettings(
    id: string,
    dto: UpdateCompanySettingsDto,
    actor: AuthenticatedUser,
    meta: RequestMeta,
  ): Promise<UpdateCompanySettingsDto> {
    this.assertCanAccessCompany(id, actor);
    const existing = await this.companyRepository.findById(id);
    if (!existing) {
      throw new NotFoundException("Empresa não encontrada.");
    }

    const entries: { chave: string; tipo: "json"; valor: string }[] = [];
    if (dto.tema !== undefined) {
      entries.push({ chave: "tema", tipo: "json", valor: JSON.stringify(dto.tema) });
    }
    if (dto.canaisNotificacao !== undefined) {
      entries.push({
        chave: "canaisNotificacao",
        tipo: "json",
        valor: JSON.stringify(dto.canaisNotificacao),
      });
    }
    if (dto.integracoes !== undefined) {
      entries.push({ chave: "integracoes", tipo: "json", valor: JSON.stringify(dto.integracoes) });
    }

    if (entries.length > 0) {
      await this.settingRepository.upsertMany(id, entries);
      await this.recordAudit({
        companyId: id,
        entidadeTipo: "CompanySetting",
        entidadeId: id,
        acao: "SETTINGS_UPDATED",
        atorUserId: actor.sub,
        dadosDepois: dto as unknown as Record<string, unknown>,
        ip: meta.ip,
        userAgent: meta.userAgent,
      });
    }

    return this.getSettings(id, actor);
  }

  async listAuditLogs(
    id: string,
    actor: AuthenticatedUser,
    page: number,
    pageSize: number,
  ): Promise<ListAuditLogsResponseDto> {
    this.assertCanAccessCompany(id, actor);
    const existing = await this.companyRepository.findById(id);
    if (!existing) {
      throw new NotFoundException("Empresa não encontrada.");
    }

    const { items, total } = await this.auditLogService.listByCompany(id, { page, pageSize });

    return {
      items: items.map((log): AuditLogResponseDto => ({
        id: log.id,
        entidadeTipo: log.entidadeTipo,
        entidadeId: log.entidadeId,
        acao: log.acao,
        atorUserId: log.atorUserId,
        dadosAntes: log.dadosAntes,
        dadosDepois: log.dadosDepois,
        createdAt: log.createdAt,
      })),
      total,
      page,
      pageSize,
    };
  }

  private async uploadImage(
    id: string,
    kind: "logo" | "foto",
    file: Express.Multer.File,
    actor: AuthenticatedUser,
    meta: RequestMeta,
  ): Promise<CompanyResponseDto> {
    this.assertCanAccessCompany(id, actor);
    const existing = await this.companyRepository.findById(id);
    if (!existing) {
      throw new NotFoundException("Empresa não encontrada.");
    }

    if (!file.mimetype.startsWith("image/")) {
      throw new BadRequestException("O arquivo enviado precisa ser uma imagem.");
    }

    const extension = file.originalname.split(".").pop() ?? "png";
    const url = await this.storageService.upload(
      `companies/${id}/${kind}.${extension}`,
      file.buffer,
      file.mimetype,
    );

    const field = kind === "logo" ? "logoUrl" : "fotoUrl";
    const updated = await this.companyRepository.update(id, { [field]: url });

    await this.recordAudit({
      companyId: id,
      entidadeTipo: "Company",
      entidadeId: id,
      acao: kind === "logo" ? "LOGO_CHANGED" : "PHOTO_CHANGED",
      atorUserId: actor.sub,
      dadosDepois: { [field]: url },
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return toCompanyResponseDto(updated);
  }

  /**
   * Auditoria é sempre best-effort em relação à operação de negócio
   * principal: perder um registro de log não pode reverter/falhar uma
   * mutação já validamente concluída (Dossiê 13 §20 trata Audit como
   * trilha de observabilidade, não como invariante transacional da
   * entidade) — nenhum chamador deste service invoca
   * `auditLogService.record` diretamente.
   */
  private async recordAudit(input: RecordAuditLogInput): Promise<void> {
    try {
      await this.auditLogService.record(input);
    } catch (error) {
      this.logger.warn(
        `Falha ao registrar auditoria (${input.entidadeTipo} ${input.entidadeId}, ação ${input.acao})`,
        error as Error,
      );
    }
  }

  uploadLogo(
    id: string,
    file: Express.Multer.File,
    actor: AuthenticatedUser,
    meta: RequestMeta,
  ): Promise<CompanyResponseDto> {
    return this.uploadImage(id, "logo", file, actor, meta);
  }

  uploadPhoto(
    id: string,
    file: Express.Multer.File,
    actor: AuthenticatedUser,
    meta: RequestMeta,
  ): Promise<CompanyResponseDto> {
    return this.uploadImage(id, "foto", file, actor, meta);
  }
}
