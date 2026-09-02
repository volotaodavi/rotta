import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";


import { COMPANY_JOIN_REQUEST_REPOSITORY } from "./company-join-requests.constants";

import type { CreateCompanyJoinRequestDto } from "./dto/create-company-join-request.dto";
import type { RejectCompanyJoinRequestDto } from "./dto/reject-company-join-request.dto";
import type {
  CompanyJoinRequestRepository,
  CompanyJoinRequestWithCompany,
  CompanyJoinRequestWithUser,
} from "./repositories/company-join-request.repository";
import type { AuthenticatedUser } from "@/common/decorators/current-user.decorator";
import type { RecordAuditLogInput } from "@/modules/audit/repositories/audit-log.repository";
import type { CompanyRepository } from "@/modules/companies/repositories/company.repository";
import type { CompanyJoinPreRegistrationRepository } from "@/modules/company-join-pre-registrations/repositories/company-join-pre-registration.repository";

import { AuditLogService } from "@/modules/audit/audit-log.service";
import { COMPANY_REPOSITORY } from "@/modules/companies/companies.constants";
import { COMPANY_JOIN_PRE_REGISTRATION_REPOSITORY } from "@/modules/company-join-pre-registrations/company-join-pre-registrations.constants";
import { UsersService } from "@/modules/users/users.service";
import { Role } from "@/shared/enums";

function onlyDigits(value: string): string {
  return value.replace(/\D/g, "");
}

export interface CompanyJoinRequestView {
  id: string;
  companyId: string;
  companyName: string;
  role: Role;
  status: "PENDENTE" | "APROVADO" | "RECUSADO";
  motivoRecusa: string | null;
  createdAt: Date;
  decidedAt: Date | null;
  /**
   * `true` quando o vínculo foi aceito na hora por bater com um
   * pré-cadastro da empresa (pedido do usuário 02/09/2026), sem
   * nenhuma decisão manual — ver `CompanyJoinRequest.preRegistrationId`.
   */
  automatico: boolean;
}

export interface CompanyJoinRequestListView extends CompanyJoinRequestView {
  userId: string;
  userName: string;
  userEmail: string;
  userTelefone: string;
}

/**
 * Frente N (briefing item 9) — pedidos de vínculo de Motorista/Monitor
 * autônomo (`AuthService.registerAutonomo`) com uma transportadora, via
 * `Company.codigoInterno` (mesmo código público do Marketplace, Frente
 * M). Caminho complementar a `InvitesService` (a empresa gera o código
 * lá; aqui é o candidato que já tem o código da empresa e pede pra
 * entrar) — nunca cria `Membership` sozinho: só a empresa/gestor decide
 * (`approve`/`reject`), visto em "Equipe" (`apps/web`).
 */
@Injectable()
export class CompanyJoinRequestsService {
  private readonly logger = new Logger(CompanyJoinRequestsService.name);

  constructor(
    @Inject(COMPANY_JOIN_REQUEST_REPOSITORY)
    private readonly joinRequestRepository: CompanyJoinRequestRepository,
    @Inject(COMPANY_REPOSITORY) private readonly companyRepository: CompanyRepository,
    @Inject(COMPANY_JOIN_PRE_REGISTRATION_REPOSITORY)
    private readonly preRegistrationRepository: CompanyJoinPreRegistrationRepository,
    private readonly usersService: UsersService,
    private readonly auditLogService: AuditLogService,
  ) {}

  async create(
    actor: AuthenticatedUser,
    dto: CreateCompanyJoinRequestDto,
  ): Promise<CompanyJoinRequestView> {
    if (actor.tenantId) {
      throw new BadRequestException("Esta conta já possui vínculo com uma empresa.");
    }

    const existing = await this.joinRequestRepository.findLatestByUser(actor.sub);
    if (existing?.status === "PENDENTE") {
      throw new BadRequestException(
        "Você já tem um pedido de vínculo pendente. Aguarde a empresa decidir antes de enviar outro.",
      );
    }

    const codigoInterno = dto.codigoInterno.trim().toUpperCase();
    const company = await this.companyRepository.findActiveByCodigoInterno(codigoInterno);
    if (!company) {
      throw new NotFoundException("Nenhuma transportadora encontrada com esse código.");
    }

    const match = await this.findPreRegistrationMatch(actor, company.id);
    if (match) {
      return this.createAutoApproved(actor, company.id, match.id, match.criadoPorId);
    }

    const created = await this.joinRequestRepository.create({
      companyId: company.id,
      userId: actor.sub,
      role: actor.role,
    });

    return this.toView(created);
  }

  /**
   * Pedido do usuário 02/09/2026: "caso o gestor já tenha
   * pré-preenchido (número de celular, nome ou alguma outra
   * informação)... ele será aceito automaticamente" — celular OU nome
   * do próprio candidato batendo com um pré-cadastro `PENDENTE` da
   * empresa, no mesmo papel.
   */
  private async findPreRegistrationMatch(actor: AuthenticatedUser, companyId: string) {
    const user = await this.usersService.findById(actor.sub);
    if (!user) return null;

    return this.preRegistrationRepository.findMatchingPending(companyId, actor.role, {
      nome: user.nome?.trim() || null,
      celular: user.telefone ? onlyDigits(user.telefone) : null,
    });
  }

  /**
   * Cria o vínculo já `APROVADO` — mesmo efeito final de `approve()`
   * (cria o `Membership`, limpa `autonomoRole`), só que sem nenhum
   * gestor clicando em "aprovar" nesse instante: quem decidiu foi o
   * pré-cadastro (`preRegistrationId`), atribuído a quem o criou
   * (`criadoPorId`) só na auditoria — `decididoPorId` fica `null`.
   */
  private async createAutoApproved(
    actor: AuthenticatedUser,
    companyId: string,
    preRegistrationId: string,
    preRegistrationCriadoPorId: string,
  ): Promise<CompanyJoinRequestView> {
    await this.usersService.createMembership({
      userId: actor.sub,
      companyId,
      role: actor.role,
      convidadoPorId: preRegistrationCriadoPorId,
    });

    const decidedAt = new Date();
    const created = await this.joinRequestRepository.create({
      companyId,
      userId: actor.sub,
      role: actor.role,
      status: "APROVADO",
      decidedAt,
      preRegistrationId,
    });

    await this.preRegistrationRepository.markVinculado(preRegistrationId, {
      vinculadoUserId: actor.sub,
      vinculadoEm: decidedAt,
    });
    await this.usersService.clearAutonomoRole(actor.sub);
    await this.recordAudit({
      companyId,
      entidadeTipo: "CompanyJoinRequest",
      entidadeId: created.id,
      acao: "JOIN_REQUEST_AUTO_APROVADO",
      atorUserId: actor.sub,
      dadosDepois: { userId: actor.sub, role: actor.role, preRegistrationId },
    });

    return this.toView(created);
  }

  /** Tela "Meu pedido" no app — último pedido feito (`PENDENTE`, `APROVADO` ou `RECUSADO`), ou `null` se nunca pediu nenhum. */
  async findMine(actor: AuthenticatedUser): Promise<CompanyJoinRequestView | null> {
    const request = await this.joinRequestRepository.findLatestByUser(actor.sub);
    return request ? this.toView(request) : null;
  }

  /** "Equipe" (`apps/web`) — pedidos `PENDENTE` da própria empresa do ator (Empresa/Gestor). */
  async findPendingForCompany(actor: AuthenticatedUser): Promise<CompanyJoinRequestListView[]> {
    if (!actor.tenantId) {
      throw new ForbiddenException("Esta conta não pertence a nenhuma empresa.");
    }
    const requests = await this.joinRequestRepository.findPendingByCompany(actor.tenantId);
    return requests.map((request) => this.toListView(request));
  }

  async approve(actor: AuthenticatedUser, id: string): Promise<CompanyJoinRequestListView> {
    const request = await this.assertOwnPendingRequest(actor, id);

    await this.usersService.createMembership({
      userId: request.userId,
      companyId: request.companyId,
      role: request.role,
      convidadoPorId: actor.sub,
    });

    const decided = await this.joinRequestRepository.decide(id, {
      status: "APROVADO",
      decididoPorId: actor.sub,
      decidedAt: new Date(),
    });

    await this.usersService.clearAutonomoRole(request.userId);
    await this.recordAudit({
      companyId: request.companyId,
      entidadeTipo: "CompanyJoinRequest",
      entidadeId: id,
      acao: "JOIN_REQUEST_APROVADO",
      atorUserId: actor.sub,
      dadosDepois: { userId: request.userId, role: request.role },
    });

    return this.toListView({ ...request, ...decided });
  }

  async reject(
    actor: AuthenticatedUser,
    id: string,
    dto: RejectCompanyJoinRequestDto,
  ): Promise<CompanyJoinRequestListView> {
    const request = await this.assertOwnPendingRequest(actor, id);

    const decided = await this.joinRequestRepository.decide(id, {
      status: "RECUSADO",
      motivoRecusa: dto.motivo,
      decididoPorId: actor.sub,
      decidedAt: new Date(),
    });

    await this.recordAudit({
      companyId: request.companyId,
      entidadeTipo: "CompanyJoinRequest",
      entidadeId: id,
      acao: "JOIN_REQUEST_RECUSADO",
      atorUserId: actor.sub,
      dadosDepois: { userId: request.userId, motivo: dto.motivo },
    });

    return this.toListView({ ...request, ...decided });
  }

  private async assertOwnPendingRequest(
    actor: AuthenticatedUser,
    id: string,
  ): Promise<CompanyJoinRequestWithUser> {
    if (!actor.tenantId) {
      throw new ForbiddenException("Esta conta não pertence a nenhuma empresa.");
    }
    const request = await this.joinRequestRepository.findById(id);
    if (!request || request.companyId !== actor.tenantId) {
      throw new NotFoundException("Pedido de vínculo não encontrado.");
    }
    if (request.status !== "PENDENTE") {
      throw new BadRequestException("Este pedido já foi decidido.");
    }
    return request;
  }

  /** Best-effort (mesmo espírito de `CompaniesService.recordAudit`) — nunca reverte a decisão já concluída. */
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

  private toView(request: CompanyJoinRequestWithCompany): CompanyJoinRequestView {
    return {
      id: request.id,
      companyId: request.companyId,
      companyName: request.company.nomeFantasia,
      role: request.role as Role,
      status: request.status,
      motivoRecusa: request.motivoRecusa,
      createdAt: request.createdAt,
      decidedAt: request.decidedAt,
      automatico: request.preRegistrationId != null,
    };
  }

  private toListView(request: CompanyJoinRequestWithUser): CompanyJoinRequestListView {
    return {
      ...this.toView(request),
      userId: request.user.id,
      userName: request.user.nome,
      userEmail: request.user.email,
      userTelefone: request.user.telefone,
    };
  }
}
