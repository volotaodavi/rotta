import { ForbiddenException, Inject, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { type Contract, type Conversation, NotificationEventType } from "@prisma/client";

import { CONVERSATION_REPOSITORY } from "./conversations.constants";
import { toConversationMessageResponseDto } from "./mappers/conversation-message.mapper";

import type { ConversationMessageResponseDto } from "./dto/conversation-message-response.dto";
import type { ConversationResponseDto } from "./dto/conversation-response.dto";
import type { CreateConversationMessageDto } from "./dto/create-conversation-message.dto";
import type { ConversationRepository } from "./repositories/conversation.repository";
import type { AuthenticatedUser } from "@/common/decorators/current-user.decorator";
import type { RecordAuditLogInput } from "@/modules/audit/repositories/audit-log.repository";

import { PrismaService } from "@/infra/database/prisma.service";
import { AuditLogService } from "@/modules/audit/audit-log.service";
import { COMMUNICATION_REQUESTED_EVENT } from "@/modules/notifications/events/communication-requested.event";
import { MessagePersonalizationService } from "@/modules/notifications/message-personalization.service";
import { UsersService } from "@/modules/users/users.service";
import { Role } from "@/shared/enums";

const ENTIDADE_TIPO = "Conversation";
const PAGE_SIZE_PADRAO = 20;

export interface RequestMeta {
  ip?: string;
  userAgent?: string;
}

/**
 * Frente 10(d) — chat direto Responsável ↔ Motorista/Monitor (pedido
 * do usuário: "suporte entre os responsáveis e motoristas/monitores").
 * NÃO reaproveita `SupportModule` (aquele é explicitamente só
 * Empresa↔Rotta, ver doc de `SupportService`). Só backend nesta
 * entrega, como pedido explicitamente ("estruture isso no backend,
 * antes de colocar no front end").
 *
 * RBAC próprio (nunca via `ContractsService.findRawByIdOrThrow`): o
 * `scopeForActor` daquele serviço não cobre Motorista/Monitor —
 * `Contract` é lido direto via `PrismaService.withBypass`, mesmo
 * padrão de `StudentsService.assertDiaAindaNaoIniciado`, e o vínculo é
 * sempre revalidado contra o `Contract` ATUAL (nunca um snapshot):
 * Motorista/Monitor substituído no meio do contrato (`TripsService.
 * substituirMotorista/substituirMonitor`) ganha/perde acesso à
 * conversa automaticamente, sem nenhuma ação própria deste módulo.
 */
@Injectable()
export class ConversationsService {
  private readonly logger = new Logger(ConversationsService.name);

  constructor(
    @Inject(CONVERSATION_REPOSITORY) private readonly repository: ConversationRepository,
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
    private readonly eventEmitter: EventEmitter2,
    private readonly messagePersonalizationService: MessagePersonalizationService,
    private readonly usersService: UsersService,
  ) {}

  private async recordAudit(input: RecordAuditLogInput): Promise<void> {
    try {
      await this.auditLogService.record(input);
    } catch (error) {
      this.logger.warn(`Falha ao registrar auditoria (Conversation ${input.entidadeId})`);
      this.logger.warn(error instanceof Error ? error.message : String(error));
    }
  }

  private async fetchContractOrThrow(contractId: string): Promise<Contract> {
    const contract = await this.prisma.withBypass(
      this.prisma.contract.findUnique({ where: { id: contractId } }),
    );
    if (!contract) {
      throw new NotFoundException("Contrato não encontrado.");
    }
    return contract;
  }

  /** O papel do ator NESTE contrato — não `actor.role` cru: um Motorista sem vínculo com este contrato nunca é "participante", mesmo sendo Motorista de outra rota. */
  private papelNoContrato(contract: Contract, actor: AuthenticatedUser): string | null {
    if (actor.role === Role.RESPONSAVEL && contract.responsavelId === actor.sub) {
      return "RESPONSAVEL";
    }
    if (actor.role === Role.MOTORISTA && contract.motoristaId === actor.sub) return "MOTORISTA";
    if (actor.role === Role.MONITOR && contract.monitorId === actor.sub) return "MONITOR";
    return null;
  }

  private assertParticipante(contract: Contract, actor: AuthenticatedUser): string {
    if (actor.role === Role.ADMIN_ROTTA) return "ADMIN_ROTTA";
    const papel = this.papelNoContrato(contract, actor);
    if (!papel) {
      throw new ForbiddenException(
        "Você não é o Responsável, Motorista ou Monitor deste contrato — sem acesso a esta conversa.",
      );
    }
    return papel;
  }

  /** Cria a conversa sob demanda (na primeira mensagem/leitura) — nunca por um endpoint próprio de "abrir conversa" (não há nada a configurar além do vínculo já existir). */
  private async getOrCreateConversation(contractId: string): Promise<Conversation> {
    const existing = await this.repository.findByContractId(contractId);
    return existing ?? this.repository.create(contractId);
  }

  async getConversation(
    contractId: string,
    actor: AuthenticatedUser,
  ): Promise<ConversationResponseDto> {
    const contract = await this.fetchContractOrThrow(contractId);
    this.assertParticipante(contract, actor);

    const conversation = await this.getOrCreateConversation(contractId);
    const naoLidas = await this.repository.countUnread(conversation.id, actor.sub);
    return {
      id: conversation.id,
      contractId: conversation.contractId,
      createdAt: conversation.createdAt,
      updatedAt: conversation.updatedAt,
      naoLidas,
    };
  }

  async listMessages(
    contractId: string,
    actor: AuthenticatedUser,
    page = 1,
    pageSize = PAGE_SIZE_PADRAO,
  ): Promise<{ items: ConversationMessageResponseDto[]; total: number }> {
    const contract = await this.fetchContractOrThrow(contractId);
    this.assertParticipante(contract, actor);

    const existing = await this.repository.findByContractId(contractId);
    if (!existing) return { items: [], total: 0 };

    const { items, total } = await this.repository.listMessages(existing.id, page, pageSize);
    return { items: items.map((m) => toConversationMessageResponseDto(m, actor.sub)), total };
  }

  async sendMessage(
    contractId: string,
    dto: CreateConversationMessageDto,
    actor: AuthenticatedUser,
    meta: RequestMeta,
  ): Promise<ConversationMessageResponseDto> {
    const contract = await this.fetchContractOrThrow(contractId);
    const papel = this.assertParticipante(contract, actor);
    if (papel === "ADMIN_ROTTA") {
      // Admin Rotta tem acesso de leitura/oversight (Trust & Community
      // Center), mas nunca escreve NO LUGAR de uma das partes — a
      // conversa é sempre entre Responsável e Motorista/Monitor.
      throw new ForbiddenException("Admin Rotta não pode enviar mensagens nesta conversa.");
    }

    const conversation = await this.getOrCreateConversation(contractId);
    const message = await this.repository.createMessage({
      conversationId: conversation.id,
      autorUserId: actor.sub,
      autorRole: papel,
      mensagem: dto.mensagem,
    });

    await this.recordAudit({
      companyId: contract.companyId,
      entidadeTipo: ENTIDADE_TIPO,
      entidadeId: conversation.id,
      acao: "CONVERSATION_MESSAGE_SENT",
      atorUserId: actor.sub,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    await this.notifyOutraParte(contract, papel, actor.sub, dto.mensagem);

    return toConversationMessageResponseDto(message, actor.sub);
  }

  async markAsRead(contractId: string, actor: AuthenticatedUser): Promise<void> {
    const contract = await this.fetchContractOrThrow(contractId);
    this.assertParticipante(contract, actor);

    const existing = await this.repository.findByContractId(contractId);
    if (!existing) return;
    await this.repository.markAllAsRead(existing.id, actor.sub);
  }

  /**
   * Best-effort (mesmo espírito de `SupportService.notifyAdmins`/
   * `notifyTenant`) — quem enviou é Responsável → notifica
   * Motorista/Monitor atuais do contrato (os dois, se houver monitor);
   * quem enviou é Motorista/Monitor → notifica só o Responsável (nunca
   * o outro papel do transportador, que pode nem saber da conversa).
   */
  private async notifyOutraParte(
    contract: Contract,
    papelAutor: string,
    autorUserId: string,
    mensagem: string,
  ): Promise<void> {
    try {
      const destinatarioIds =
        papelAutor === "RESPONSAVEL"
          ? [contract.motoristaId, contract.monitorId].filter((id): id is string => !!id)
          : [contract.responsavelId];
      if (destinatarioIds.length === 0) return;

      const autor = await this.usersService.findById(autorUserId);
      const previa = mensagem.length > 120 ? `${mensagem.slice(0, 117)}...` : mensagem;
      const texto = this.messagePersonalizationService.novaMensagemConversa(
        autor?.nome ?? "Alguém",
        previa,
      );

      for (const destinatarioId of destinatarioIds) {
        this.eventEmitter.emit(COMMUNICATION_REQUESTED_EVENT, {
          userId: destinatarioId,
          companyId: contract.companyId,
          tipo: NotificationEventType.CONVERSA_NOVA_MENSAGEM,
          titulo: texto.titulo,
          corpo: texto.corpo,
          dadosContexto: { contractId: contract.id },
        });
      }
    } catch (error) {
      this.logger.warn(`Falha ao notificar a outra parte da conversa (contrato ${contract.id}).`);
      this.logger.warn(error instanceof Error ? error.message : String(error));
    }
  }
}
