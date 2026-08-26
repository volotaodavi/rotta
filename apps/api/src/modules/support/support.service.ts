import { ForbiddenException, Inject, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";

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

import { EmailService } from "@/infra/email/email.service";
import { renderNotificationEmailHtml } from "@/infra/email/templates/notification-email.template";
import { AuditLogService } from "@/modules/audit/audit-log.service";
import { COMMUNICATION_REQUESTED_EVENT } from "@/modules/notifications/events/communication-requested.event";
import { MessagePersonalizationService } from "@/modules/notifications/message-personalization.service";
import { UsersService } from "@/modules/users/users.service";
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
 * Notificação de nova resposta (pedido do usuário: "quando as pessoas
 * forem acionar o suporte, esse fluxo deverá estar funcionando...
 * aparecer no painel do admin", "a cada pedido de suporte deverá ser
 * notificado no e-mail da Rotta também") — fecha o gap que antes
 * ficava documentado aqui como "iteração futura": `createTicket`
 * notifica todo Admin Rotta (in-app/push/e-mail pessoal via
 * `COMMUNICATION_REQUESTED_EVENT` + e-mail direto pra caixa fixa da
 * Rotta, `SUPPORT_INBOX_EMAIL`); `addMessage` notifica o lado oposto da
 * conversa (Admin respondeu → tenant é avisado; tenant escreveu de novo
 * → todo Admin Rotta é avisado, com o mesmo e-mail pra caixa fixa).
 */
@Injectable()
export class SupportService {
  private readonly logger = new Logger(SupportService.name);

  constructor(
    @Inject(SUPPORT_TICKET_REPOSITORY) private readonly ticketRepository: SupportTicketRepository,
    @Inject(SUPPORT_MESSAGE_REPOSITORY)
    private readonly messageRepository: SupportMessageRepository,
    private readonly auditLogService: AuditLogService,
    private readonly usersService: UsersService,
    private readonly eventEmitter: EventEmitter2,
    private readonly messagePersonalizationService: MessagePersonalizationService,
    private readonly emailService: EmailService,
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

  /** Link clicável pro painel Admin — omitido (o e-mail só descreve) sem `ADMIN_APP_URL` configurada. */
  private buildAdminTicketUrl(ticketId: string, companyId: string): string | null {
    const base = process.env.ADMIN_APP_URL?.replace(/\/$/, "");
    return base ? `${base}/suporte/${ticketId}?companyId=${companyId}` : null;
  }

  /**
   * Notifica todo Admin Rotta (in-app/push/e-mail pessoal, mesmo
   * pipeline de qualquer outro evento) + envia uma cópia direta pra
   * caixa fixa da Rotta (`SUPPORT_INBOX_EMAIL`) — não é um `User.email`
   * comum, então nunca passa pelo Communication Engine por usuário.
   * Nunca bloqueia a operação principal (best-effort, mesmo espírito de
   * `recordAudit`).
   */
  private async notifyAdminRottaENovoTicketOuMensagem(input: {
    ticketId: string;
    companyId: string;
    companyNome: string;
    assunto: string;
    autorNome: string;
    tipo: "SUPORTE_TICKET_ABERTO" | "SUPORTE_NOVA_MENSAGEM";
    previaMensagem?: string;
  }): Promise<void> {
    try {
      const adminIds = await this.usersService.listAdminRottaUserIds();
      const mensagem =
        input.tipo === "SUPORTE_TICKET_ABERTO"
          ? this.messagePersonalizationService.suporteTicketAberto(
              input.assunto,
              input.autorNome,
              input.companyNome,
            )
          : this.messagePersonalizationService.suporteNovaMensagem(
              input.assunto,
              input.autorNome,
              input.previaMensagem ?? "",
            );

      for (const adminUserId of adminIds) {
        this.eventEmitter.emit(COMMUNICATION_REQUESTED_EVENT, {
          userId: adminUserId,
          tipo: input.tipo,
          titulo: mensagem.titulo,
          corpo: mensagem.corpo,
          dadosContexto: { ticketId: input.ticketId, companyId: input.companyId },
        });
      }
    } catch (error) {
      this.logger.warn(`Falha ao notificar Admin Rotta sobre o chamado ${input.ticketId}.`);
      this.logger.warn(error instanceof Error ? error.message : String(error));
    }

    const inboxEmail = process.env.SUPPORT_INBOX_EMAIL;
    if (!inboxEmail) return;
    try {
      const url = this.buildAdminTicketUrl(input.ticketId, input.companyId);
      const corpoBase =
        input.tipo === "SUPORTE_TICKET_ABERTO"
          ? `${input.autorNome} (${input.companyNome}) abriu um chamado de suporte: "${input.assunto}".`
          : `${input.autorNome} (${input.companyNome}) escreveu em "${input.assunto}": ${input.previaMensagem}`;
      const corpo = url ? `${corpoBase}\n\nVer no painel: ${url}` : corpoBase;
      await this.emailService.sendEmail(
        inboxEmail,
        input.tipo === "SUPORTE_TICKET_ABERTO"
          ? "Novo chamado de suporte"
          : "Nova mensagem de suporte",
        renderNotificationEmailHtml({
          titulo:
            input.tipo === "SUPORTE_TICKET_ABERTO"
              ? "Novo chamado de suporte"
              : "Nova mensagem de suporte",
          corpo,
        }),
      );
    } catch (error) {
      this.logger.warn(
        `Falha ao enviar e-mail pra caixa de suporte sobre o chamado ${input.ticketId}.`,
      );
      this.logger.warn(error instanceof Error ? error.message : String(error));
    }
  }

  /** Resposta de um Admin Rotta chega pro tenant que abriu o chamado — só in-app/push/e-mail pessoal, nunca a caixa fixa (a Rotta já sabe, foi ela quem respondeu). */
  private notifyTenantSobreResposta(input: {
    ticketId: string;
    companyId: string;
    destinatarioUserId: string;
    assunto: string;
    autorNome: string;
    previaMensagem: string;
  }): void {
    try {
      const mensagem = this.messagePersonalizationService.suporteNovaMensagem(
        input.assunto,
        input.autorNome,
        input.previaMensagem,
      );
      this.eventEmitter.emit(COMMUNICATION_REQUESTED_EVENT, {
        userId: input.destinatarioUserId,
        companyId: input.companyId,
        tipo: "SUPORTE_NOVA_MENSAGEM",
        titulo: mensagem.titulo,
        corpo: mensagem.corpo,
        dadosContexto: { ticketId: input.ticketId },
      });
    } catch (error) {
      this.logger.warn(`Falha ao notificar tenant sobre resposta no chamado ${input.ticketId}.`);
      this.logger.warn(error instanceof Error ? error.message : String(error));
    }
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

    await this.notifyAdminRottaENovoTicketOuMensagem({
      ticketId: ticket.id,
      companyId: ticket.companyId,
      companyNome: ticket.company.nomeFantasia,
      assunto: ticket.assunto,
      autorNome: ticket.abertoPor.nome,
      tipo: "SUPORTE_TICKET_ABERTO",
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

    const autor = await this.usersService.findById(actor.sub);
    const autorNome = autor?.nome ?? "Alguém";
    if (isAdminRotta) {
      // Admin Rotta respondeu → só o tenant que abriu o chamado é
      // avisado (a Rotta já sabe, foi ela quem escreveu — nunca envia
      // e-mail pra caixa fixa aqui).
      this.notifyTenantSobreResposta({
        ticketId,
        companyId: ticket.companyId,
        destinatarioUserId: ticket.abertoPorUserId,
        assunto: ticket.assunto,
        autorNome,
        previaMensagem: dto.mensagem,
      });
    } else {
      // Tenant escreveu de novo (pedido explícito: "mesmo se a pessoa...
      // comunicar erro dentro da web/app") → todo Admin Rotta + e-mail
      // pra caixa fixa da Rotta.
      await this.notifyAdminRottaENovoTicketOuMensagem({
        ticketId,
        companyId: ticket.companyId,
        companyNome: ticket.company.nomeFantasia,
        assunto: ticket.assunto,
        autorNome,
        tipo: "SUPORTE_NOVA_MENSAGEM",
        previaMensagem: dto.mensagem,
      });
    }

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
