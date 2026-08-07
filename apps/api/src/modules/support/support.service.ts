import { ForbiddenException, Inject, Injectable, Logger, NotFoundException } from "@nestjs/common";

import { toSupportMessageResponseDto } from "./mappers/support-message.mapper";
import {
  toSupportTicketDetailResponseDto,
  toSupportTicketResponseDto,
} from "./mappers/support-ticket.mapper";
import { SUPPORT_MESSAGE_REPOSITORY, SUPPORT_TICKET_REPOSITORY } from "./support.constants";

import type { CreateSupportMessageDto } from "./dto/create-support-message.dto";
import type { CreateSupportTicketDto } from "./dto/create-support-ticket.dto";
import type { ListSupportTicketsQueryDto } from "./dto/list-support-tickets-query.dto";
import type { SupportMessageResponseDto } from "./dto/support-message-response.dto";
import type {
  ListSupportTicketsResponseDto,
  SupportTicketDetailResponseDto,
  SupportTicketResponseDto,
} from "./dto/support-ticket-response.dto";
import type { SupportMessageRepository } from "./repositories/support-message.repository";
import type { SupportTicketRepository } from "./repositories/support-ticket.repository";
import type { AuthenticatedUser } from "@/common/decorators/current-user.decorator";
import type { RecordAuditLogInput } from "@/modules/audit/repositories/audit-log.repository";

import { AuditLogService } from "@/modules/audit/audit-log.service";
import { Role } from "@/shared/enums";

export interface RequestMeta {
  ip?: string;
  userAgent?: string;
}

const ENTIDADE_TIPO = "SupportTicket";

/**
 * Núcleo de negócio do módulo Suporte (Dossiê 20, `SUP-01` a `SUP-03` +
 * `ADM-04` — "é a visão administrativa de SUP-01/SUP-02, sem regras
 * adicionais além do escopo cross-tenant").
 *
 * RBAC (`SUP-01`, RN): "um tenant só visualiza seus próprios tickets;
 * Admin Rotta visualiza todos" — `Role.EMPRESA`/`Role.GESTOR` sempre
 * restritos ao próprio `companyId` (nunca aceitam um `companyId` vindo
 * do cliente); `Role.ADMIN_ROTTA` cross-tenant, com filtro opcional.
 *
 * Notificação por push/e-mail de nova resposta (`SUP-02`, "usuário é
 * notificado") fica para uma iteração futura — exigiria adicionar um
 * novo `NotificationEventType` ao enum Prisma (nova migração fora do
 * escopo desta entrega); documentado no Dossiê 29.
 */
@Injectable()
export class SupportService {
  private readonly logger = new Logger(SupportService.name);

  constructor(
    @Inject(SUPPORT_TICKET_REPOSITORY) private readonly ticketRepository: SupportTicketRepository,
    @Inject(SUPPORT_MESSAGE_REPOSITORY)
    private readonly messageRepository: SupportMessageRepository,
    private readonly auditLogService: AuditLogService,
  ) {}

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

  /** `undefined` = Admin Rotta sem filtro de empresa (cross-tenant); string = escopo obrigatório de Empresa/Gestor. */
  private resolveCompanyScope(
    actor: AuthenticatedUser,
    companyIdFilter?: string,
  ): string | undefined {
    if (actor.role === Role.ADMIN_ROTTA) {
      return companyIdFilter;
    }
    if (!actor.tenantId) {
      throw new ForbiddenException("Usuário sem empresa vinculada.");
    }
    return actor.tenantId;
  }

  async createTicket(
    dto: CreateSupportTicketDto,
    actor: AuthenticatedUser,
    meta: RequestMeta,
  ): Promise<SupportTicketResponseDto> {
    if (actor.role !== Role.EMPRESA && actor.role !== Role.GESTOR) {
      throw new ForbiddenException("Apenas Empresa/Gestor podem abrir chamados de suporte.");
    }
    if (!actor.tenantId) {
      throw new ForbiddenException("Usuário sem empresa vinculada.");
    }

    const ticket = await this.ticketRepository.create({
      companyId: actor.tenantId,
      abertoPorUserId: actor.sub,
      assunto: dto.assunto,
      descricao: dto.descricao,
      categoria: dto.categoria,
      anexoUrl: dto.anexoUrl,
    });

    await this.recordAudit({
      companyId: actor.tenantId,
      entidadeTipo: ENTIDADE_TIPO,
      entidadeId: ticket.id,
      acao: "SUPPORT_TICKET_OPENED",
      atorUserId: actor.sub,
      dadosDepois: { assunto: ticket.assunto, categoria: ticket.categoria },
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return toSupportTicketResponseDto(ticket);
  }

  async listTickets(
    query: ListSupportTicketsQueryDto,
    actor: AuthenticatedUser,
  ): Promise<ListSupportTicketsResponseDto> {
    const companyId = this.resolveCompanyScope(actor, query.companyId);
    const { items, total } = await this.ticketRepository.list({
      companyId,
      status: query.status,
      categoria: query.categoria,
      page: query.page,
      pageSize: query.pageSize,
    });

    return {
      items: items.map(toSupportTicketResponseDto),
      total,
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  async getTicketDetail(
    ticketId: string,
    actor: AuthenticatedUser,
    companyIdFilter?: string,
  ): Promise<SupportTicketDetailResponseDto> {
    const companyId = this.resolveCompanyScope(actor, companyIdFilter);
    const ticket = await this.ticketRepository.findById(ticketId, companyId);
    if (!ticket) {
      throw new NotFoundException("Chamado não encontrado.");
    }

    const messages = await this.messageRepository.listByTicket(ticketId, companyId);
    return toSupportTicketDetailResponseDto(ticket, messages);
  }

  /**
   * `SUP-02`: qualquer uma das partes pode responder. Regras automáticas
   * (nunca uma ação manual separada):
   * - Ticket `ABERTO` recebendo a primeira resposta de um Admin Rotta →
   *   `EM_ANDAMENTO` (só indicador de UI, ver comentário do enum no
   *   schema).
   * - Ticket `ENCERRADO` recebendo qualquer mensagem nova → reabre
   *   (`SUP-02`, RN: "mensagens em um ticket já encerrado exigem
   *   reabertura automática... não é possível conversar em um ticket
   *   fechado sem reabri-lo formalmente"), preservando o histórico
   *   (nunca cria um ticket novo).
   */
  async addMessage(
    ticketId: string,
    dto: CreateSupportMessageDto,
    actor: AuthenticatedUser,
    meta: RequestMeta,
    companyIdFilter?: string,
  ): Promise<SupportMessageResponseDto> {
    const companyId = this.resolveCompanyScope(actor, companyIdFilter);
    const ticket = await this.ticketRepository.findById(ticketId, companyId);
    if (!ticket) {
      throw new NotFoundException("Chamado não encontrado.");
    }

    const isAdminRotta = actor.role === Role.ADMIN_ROTTA;
    const message = await this.messageRepository.create({
      ticketId,
      companyId: ticket.companyId,
      autorUserId: actor.sub,
      autorIsAdminRotta: isAdminRotta,
      mensagem: dto.mensagem,
      anexoUrl: dto.anexoUrl,
    });

    if (ticket.status === "ENCERRADO") {
      await this.ticketRepository.updateStatus(ticketId, {
        status: "EM_ANDAMENTO",
        encerradoEm: null,
        encerradoPorUserId: null,
      });
      await this.recordAudit({
        companyId: ticket.companyId,
        entidadeTipo: ENTIDADE_TIPO,
        entidadeId: ticketId,
        acao: "SUPPORT_TICKET_REOPENED",
        atorUserId: actor.sub,
        dadosDepois: { motivo: "nova_mensagem" },
        ip: meta.ip,
        userAgent: meta.userAgent,
      });
    } else if (ticket.status === "ABERTO" && isAdminRotta) {
      await this.ticketRepository.updateStatus(ticketId, { status: "EM_ANDAMENTO" });
    }

    await this.recordAudit({
      companyId: ticket.companyId,
      entidadeTipo: ENTIDADE_TIPO,
      entidadeId: ticketId,
      acao: "SUPPORT_MESSAGE_SENT",
      atorUserId: actor.sub,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return toSupportMessageResponseDto(message);
  }

  /** `SUP-01`: "encerrado quando resolvido, por qualquer uma das partes." */
  async closeTicket(
    ticketId: string,
    actor: AuthenticatedUser,
    meta: RequestMeta,
    companyIdFilter?: string,
  ): Promise<SupportTicketResponseDto> {
    const companyId = this.resolveCompanyScope(actor, companyIdFilter);
    const existing = await this.ticketRepository.findById(ticketId, companyId);
    if (!existing) {
      throw new NotFoundException("Chamado não encontrado.");
    }

    const updated = await this.ticketRepository.updateStatus(ticketId, {
      status: "ENCERRADO",
      encerradoEm: new Date(),
      encerradoPorUserId: actor.sub,
    });

    await this.recordAudit({
      companyId: existing.companyId,
      entidadeTipo: ENTIDADE_TIPO,
      entidadeId: ticketId,
      acao: "SUPPORT_TICKET_CLOSED",
      atorUserId: actor.sub,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return toSupportTicketResponseDto(updated);
  }
}
