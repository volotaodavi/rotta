import { randomBytes } from "node:crypto";

import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
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
import type {
  SupportTicketRepository,
  SupportTicketWithRelations,
} from "./repositories/support-ticket.repository";
import type { AuthenticatedUser } from "@/common/decorators/current-user.decorator";
import type { RecordAuditLogInput } from "@/modules/audit/repositories/audit-log.repository";

import { AdminInboxEmailService } from "@/infra/email/admin-inbox-email.service";
import { EmailService } from "@/infra/email/email.service";
import { renderNotificationEmailHtml } from "@/infra/email/templates/notification-email.template";
import { SupportAiService } from "@/infra/support-ai/support-ai.service";
import { AuditLogService } from "@/modules/audit/audit-log.service";
import { ContractsService } from "@/modules/marketplace/contracts.service";
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
    private readonly adminInboxEmailService: AdminInboxEmailService,
    private readonly supportAiService: SupportAiService,
    private readonly contractsService: ContractsService,
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

  /**
   * Escopo de leitura/ação sobre um chamado (Epic B estendeu de "só
   * `companyId`" para uma de duas dimensões, nunca as duas):
   * - `companyId` — Empresa/Gestor (próprio tenant) e Admin Rotta
   *   (filtro opcional, `undefined` = cross-tenant, `SUP-01`/`ADM-04`).
   * - `abertoPorUserId` — `Role.RESPONSAVEL`: SEM `tenantId` (não é
   *   membro de nenhuma empresa), por isso nunca listado por
   *   `companyId` — escopado ao próprio chamado, nunca ao tenant
   *   inteiro (só vê o que ele mesmo abriu, diferente de Empresa/Gestor
   *   que veem todo o tenant).
   */
  private resolveTicketScope(
    actor: AuthenticatedUser,
    companyIdFilter?: string,
  ): { companyId?: string; abertoPorUserId?: string } {
    if (actor.role === Role.ADMIN_ROTTA) {
      return { companyId: companyIdFilter };
    }
    if (actor.role === Role.RESPONSAVEL) {
      return { abertoPorUserId: actor.sub };
    }
    if (!actor.tenantId) {
      throw new ForbiddenException("Usuário sem empresa vinculada.");
    }
    return { companyId: actor.tenantId };
  }

  /**
   * Resolve a transportadora "dona" de um chamado aberto por
   * `Role.RESPONSAVEL` (Epic B) — o Responsável não tem `companyId`
   * próprio (não é membro de nenhum tenant), então o chamado é
   * registrado sob a transportadora do contrato ATIVO mais recente
   * (reaproveita `ContractsService.list`, já escopado por
   * `responsavelId` — ver `ContractsService.scopeForActor`). Sem
   * nenhum contrato ativo, não há "a quem" endereçar o chamado — erro
   * claro em vez de uma empresa arbitrária/vazia.
   */
  private async resolveResponsavelCompanyId(actor: AuthenticatedUser): Promise<string> {
    const { items } = await this.contractsService.list({ page: 1, pageSize: 50 }, actor);
    const ativo = items
      .slice()
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .find((contract) => contract.status === "ATIVO");
    if (!ativo) {
      throw new BadRequestException(
        "Você precisa estar vinculado a uma transportadora com um contrato ativo para abrir um chamado.",
      );
    }
    return ativo.companyId;
  }

  /**
   * Número de protocolo (pedido do usuário 02/09/2026: "criar
   * protocolo, armazenar os detalhes do chamado") — gerado ANTES do
   * insert (não pelo banco), formato "RT-AAAAMMDD-XXXXXX" (6 hex
   * maiúsculos, ~16M combinações/dia — colisão real é astronômica pra
   * um volume de chamados de suporte; não vale um retry-loop).
   */
  private gerarProtocolo(): string {
    const hoje = new Date();
    const data = `${hoje.getUTCFullYear()}${String(hoje.getUTCMonth() + 1).padStart(2, "0")}${String(hoje.getUTCDate()).padStart(2, "0")}`;
    const sufixo = randomBytes(3).toString("hex").toUpperCase();
    return `RT-${data}-${sufixo}`;
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

      // Caixa fixa da Rotta — FALLBACK de verdade agora, só quando não
      // existe nenhuma conta Admin Rotta cadastrada ainda (mesmo
      // propósito documentado em `AdminInboxEmailService`: "garantia de
      // que o e-mail chega... mesmo que nenhuma conta Admin Rotta
      // exista ainda"). Antes disparava SEMPRE, em cima do que cada
      // Admin Rotta já recebe via `COMMUNICATION_REQUESTED_EVENT`
      // (loop acima) — com as contas de papel Geral/Financeiro/Suporte
      // já existindo (RBAC de sub-papéis), isso virava várias cópias
      // do mesmo aviso pro mesmo lugar (pedido do usuário 03/09/2026:
      // "mesmo chamando uma vez o suporte, chegam disparando e-mails
      // pra mim (chegaram 6), conserte").
      if (input.tipo === "SUPORTE_TICKET_ABERTO" && adminIds.length === 0) {
        void this.adminInboxEmailService.send(mensagem.titulo, mensagem.corpo, "suporte");
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
        "suporte",
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

  /**
   * IA de suporte (Frente 5, Gemini — trocado de Groq a pedido do
   * usuário 02/09/2026: "Groq não está indo") — agora processa TODA
   * categoria (pedido do usuário: os 3 graus de atendimento — Grau 1
   * bug, Grau 2 dúvida, Grau 3 cobrança), não só `DUVIDA`/
   * `PROBLEMA_TECNICO` como antes. `SupportAiService.processarChamado`
   * já garante, no próprio prompt, que COBRANCA/OUTRO nunca recebem uma
   * resposta financeira — só um reconhecimento curto + aviso de que um
   * humano vai continuar (ver `SYSTEM_PROMPT`).
   *
   * Sempre grava DUAS coisas quando a IA responde:
   * - `resumoIA` no próprio ticket — o "documento com os detalhes do
   *   chamado"/protocolo pedido pelo usuário, visível só no Admin.
   * - Uma `SupportMessage` comum (`autorIsIA: true`, sem `autorUserId`)
   *   com a resposta visível ao tenant — preserva o histórico como
   *   mensagem normal, só estilizada diferente no chat.
   *
   * Best-effort: sem `SUPPORT_AI_API_KEY` configurada ou qualquer falha
   * de rede, não faz nada — o chamado já foi criado normalmente antes
   * desta chamada. Nenhum escalonamento dedicado: a próxima mensagem do
   * tenant (se a IA não resolveu) já dispara a notificação normal pro
   * Admin Rotta (`notifyAdminRottaENovoTicketOuMensagem`), então um
   * humano sempre entra se necessário.
   *
   * `bypass`: chamado aberto por `Role.RESPONSAVEL` (Epic B) — a
   * mensagem/resumo da IA precisam do mesmo bypass de RLS da criação do
   * chamado (ver `createTicket`), já que o contexto de tenant da
   * requisição corrente continua sendo o do Responsável.
   */
  private async processarChamadoComIA(
    ticket: {
      id: string;
      companyId: string;
      assunto: string;
      descricao: string;
      categoria: string;
    },
    bypass = false,
  ): Promise<void> {
    try {
      const { resumoInterno, respostaTenant } = await this.supportAiService.processarChamado(
        ticket.assunto,
        ticket.descricao,
        ticket.categoria,
      );

      await (bypass
        ? this.ticketRepository.updateResumoIABypass(ticket.id, resumoInterno)
        : this.ticketRepository.updateResumoIA(ticket.id, resumoInterno));

      if (respostaTenant) {
        const data = {
          ticketId: ticket.id,
          companyId: ticket.companyId,
          autorIsAdminRotta: false,
          autorIsIA: true,
          mensagem: respostaTenant,
        };
        await (bypass
          ? this.messageRepository.createBypass(data)
          : this.messageRepository.create(data));
      }
    } catch (error) {
      this.logger.warn(`Rotta AI não processou o chamado ${ticket.id} (best-effort).`);
      this.logger.warn(error instanceof Error ? error.message : String(error));
    }
  }

  async createTicket(
    dto: CreateSupportTicketDto,
    actor: AuthenticatedUser,
    meta: RequestMeta,
  ): Promise<SupportTicketResponseDto> {
    if (actor.role === Role.RESPONSAVEL) {
      const companyId = await this.resolveResponsavelCompanyId(actor);
      const ticket = await this.ticketRepository.createBypass({
        companyId,
        abertoPorUserId: actor.sub,
        assunto: dto.assunto,
        descricao: dto.descricao,
        categoria: dto.categoria,
        anexoUrl: dto.anexoUrl,
        protocolo: this.gerarProtocolo(),
      });
      return this.finishCreateTicket(ticket, actor, meta, true);
    }

    if (actor.role !== Role.EMPRESA && actor.role !== Role.GESTOR) {
      throw new ForbiddenException(
        "Apenas Empresa/Gestor/Responsável podem abrir chamados de suporte.",
      );
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
      protocolo: this.gerarProtocolo(),
    });

    return this.finishCreateTicket(ticket, actor, meta, false);
  }

  /** Auditoria + notificação Admin Rotta + tentativa de resposta da IA — comum aos dois caminhos de `createTicket` (Empresa/Gestor via `withTenant`, Responsável via `withBypass`, ver Epic B). */
  private async finishCreateTicket(
    ticket: SupportTicketWithRelations,
    actor: AuthenticatedUser,
    meta: RequestMeta,
    bypass: boolean,
  ): Promise<SupportTicketResponseDto> {
    await this.recordAudit({
      companyId: ticket.companyId,
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

    await this.processarChamadoComIA(
      {
        id: ticket.id,
        companyId: ticket.companyId,
        assunto: ticket.assunto,
        descricao: ticket.descricao,
        categoria: ticket.categoria,
      },
      bypass,
    );

    return toSupportTicketResponseDto(ticket, actor.role === Role.ADMIN_ROTTA);
  }

  async listTickets(
    query: ListSupportTicketsQueryDto,
    actor: AuthenticatedUser,
  ): Promise<ListSupportTicketsResponseDto> {
    const scope = this.resolveTicketScope(actor, query.companyId);
    const { items, total } = await this.ticketRepository.list({
      companyId: scope.companyId,
      abertoPorUserId: scope.abertoPorUserId,
      status: query.status,
      categoria: query.categoria,
      arquivado: query.arquivado ?? false,
      page: query.page,
      pageSize: query.pageSize,
    });

    const isAdmin = actor.role === Role.ADMIN_ROTTA;
    return {
      items: items.map((ticket) => toSupportTicketResponseDto(ticket, isAdmin)),
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
    const scope = this.resolveTicketScope(actor, companyIdFilter);
    const ticket = await this.ticketRepository.findById(
      ticketId,
      scope.companyId,
      scope.abertoPorUserId,
    );
    if (!ticket) {
      throw new NotFoundException("Chamado não encontrado.");
    }

    const messages = await this.messageRepository.listByTicket(ticketId, scope.companyId);
    return toSupportTicketDetailResponseDto(ticket, messages, actor.role === Role.ADMIN_ROTTA);
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
    const scope = this.resolveTicketScope(actor, companyIdFilter);
    const ticket = await this.ticketRepository.findById(
      ticketId,
      scope.companyId,
      scope.abertoPorUserId,
    );
    if (!ticket) {
      throw new NotFoundException("Chamado não encontrado.");
    }

    // Responsável não pertence ao tenant da transportadora — bypass
    // explícito de RLS, mesmo motivo de `createTicket`/`tentarResponderComIA`.
    const bypass = actor.role === Role.RESPONSAVEL;
    const isAdminRotta = actor.role === Role.ADMIN_ROTTA;
    const messageData = {
      ticketId,
      companyId: ticket.companyId,
      autorUserId: actor.sub,
      autorIsAdminRotta: isAdminRotta,
      mensagem: dto.mensagem,
      anexoUrl: dto.anexoUrl,
    };
    const message = await (bypass
      ? this.messageRepository.createBypass(messageData)
      : this.messageRepository.create(messageData));

    if (ticket.status === "ENCERRADO") {
      const reopenData = {
        status: "EM_ANDAMENTO" as const,
        encerradoEm: null,
        encerradoPorUserId: null,
      };
      await (bypass
        ? this.ticketRepository.updateStatusBypass(ticketId, reopenData)
        : this.ticketRepository.updateStatus(ticketId, reopenData));
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
    const scope = this.resolveTicketScope(actor, companyIdFilter);
    const existing = await this.ticketRepository.findById(
      ticketId,
      scope.companyId,
      scope.abertoPorUserId,
    );
    if (!existing) {
      throw new NotFoundException("Chamado não encontrado.");
    }

    const closeData = {
      status: "ENCERRADO" as const,
      encerradoEm: new Date(),
      encerradoPorUserId: actor.sub,
    };
    const updated =
      actor.role === Role.RESPONSAVEL
        ? await this.ticketRepository.updateStatusBypass(ticketId, closeData)
        : await this.ticketRepository.updateStatus(ticketId, closeData);

    await this.recordAudit({
      companyId: existing.companyId,
      entidadeTipo: ENTIDADE_TIPO,
      entidadeId: ticketId,
      acao: "SUPPORT_TICKET_CLOSED",
      atorUserId: actor.sub,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    // Informativo pro Admin Rotta (pedido do usuário 01/09/2026:
    // "finalização de chamados"). Best-effort, nunca impede o
    // encerramento em si de ter sido aplicado acima.
    this.notifyAdminRottaTicketEncerradoBestEffort(existing);

    return toSupportTicketResponseDto(updated, actor.role === Role.ADMIN_ROTTA);
  }

  /**
   * Arquivar/desarquivar (pedido do usuário 02/09/2026: "arquivar"
   * como estado "à parte" do ciclo aberto/andamento/encerrado — um
   * ticket `ENCERRADO` pode também estar arquivado, os dois campos são
   * independentes). Nunca pelo Responsável (a família não administra a
   * fila de chamados) — mesmo motivo de `setArquivado` não ter
   * variante `bypass` no repositório.
   */
  async archiveTicket(
    ticketId: string,
    actor: AuthenticatedUser,
    meta: RequestMeta,
    companyIdFilter?: string,
  ): Promise<SupportTicketResponseDto> {
    return this.setArquivado(ticketId, true, actor, meta, companyIdFilter);
  }

  async unarchiveTicket(
    ticketId: string,
    actor: AuthenticatedUser,
    meta: RequestMeta,
    companyIdFilter?: string,
  ): Promise<SupportTicketResponseDto> {
    return this.setArquivado(ticketId, false, actor, meta, companyIdFilter);
  }

  private async setArquivado(
    ticketId: string,
    arquivado: boolean,
    actor: AuthenticatedUser,
    meta: RequestMeta,
    companyIdFilter?: string,
  ): Promise<SupportTicketResponseDto> {
    if (actor.role === Role.RESPONSAVEL) {
      throw new ForbiddenException("Responsável não administra a fila de chamados.");
    }
    const scope = this.resolveTicketScope(actor, companyIdFilter);
    const existing = await this.ticketRepository.findById(ticketId, scope.companyId);
    if (!existing) {
      throw new NotFoundException("Chamado não encontrado.");
    }

    const updated = await this.ticketRepository.setArquivado(ticketId, {
      arquivado,
      arquivadoEm: arquivado ? new Date() : null,
    });

    await this.recordAudit({
      companyId: existing.companyId,
      entidadeTipo: ENTIDADE_TIPO,
      entidadeId: ticketId,
      acao: arquivado ? "SUPPORT_TICKET_ARCHIVED" : "SUPPORT_TICKET_UNARCHIVED",
      atorUserId: actor.sub,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return toSupportTicketResponseDto(updated, actor.role === Role.ADMIN_ROTTA);
  }

  /** Best-effort — ver nota no chamador. */
  private notifyAdminRottaTicketEncerradoBestEffort(ticket: SupportTicketWithRelations): void {
    const mensagem = this.messagePersonalizationService.suporteTicketEncerrado(
      ticket.assunto,
      ticket.company.nomeFantasia,
    );

    // Caixa fixa da Rotta (pedido do usuário 01/09/2026) — garante a
    // entrega mesmo sem nenhuma conta Admin Rotta real configurada.
    void this.adminInboxEmailService.send(mensagem.titulo, mensagem.corpo, "suporte");

    this.usersService
      .listAdminRottaUserIds()
      .then((adminIds) => {
        for (const adminUserId of adminIds) {
          this.eventEmitter.emit(COMMUNICATION_REQUESTED_EVENT, {
            userId: adminUserId,
            tipo: "SUPORTE_TICKET_ENCERRADO",
            titulo: mensagem.titulo,
            corpo: mensagem.corpo,
            dadosContexto: { ticketId: ticket.id, companyId: ticket.companyId },
          });
        }
      })
      .catch((error: unknown) => {
        this.logger.warn(
          `Não foi possível notificar Admin Rotta sobre o encerramento do chamado ${ticket.id}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      });
  }
}
