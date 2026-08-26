import { Inject, Injectable, Logger } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { AnnouncementAudience } from "@prisma/client";

import { ANNOUNCEMENT_REPOSITORY } from "./announcements.constants";
import { toAnnouncementResponseDto } from "./mappers/announcement.mapper";

import type { CreateAnnouncementDto } from "./dto/create-announcement.dto";
import type {
  AnnouncementResponseDto,
  ListAnnouncementsResponseDto,
} from "./dto/announcement-response.dto";
import type { ListAnnouncementsQueryDto } from "./dto/list-announcements-query.dto";
import type { AnnouncementRepository } from "./repositories/announcement.repository";
import type { AuthenticatedUser } from "@/common/decorators/current-user.decorator";

import { COMMUNICATION_REQUESTED_EVENT } from "@/modules/notifications/events/communication-requested.event";
import { MessagePersonalizationService } from "@/modules/notifications/message-personalization.service";
import { UsersService } from "@/modules/users/users.service";
import { Role } from "@/shared/enums";

/**
 * Núcleo de negócio do módulo Avisos/Comunicados (pedido do usuário:
 * "no painel do admin também deverá ter uma aba de criação de avisos,
 * comunicados e notificações gerais. A cada comunicação nova deverá
 * ser um push notification"). Exclusivo de Admin Rotta — resolve os
 * destinatários do público escolhido e emite um `COMMUNICATION_REQUESTED_EVENT`
 * (tipo `AVISO_GERAL`, canal `PUSH` — ver `NotificationChannelSelectorService`)
 * por usuário, em lote. Uma falha isolada de fan-out nunca derruba a
 * publicação (mesmo espírito de `SupportService.notifyAdminRottaENovoTicketOuMensagem`),
 * já que o `Announcement` grava o histórico antes do fan-out começar.
 */
@Injectable()
export class AnnouncementsService {
  private readonly logger = new Logger(AnnouncementsService.name);

  constructor(
    @Inject(ANNOUNCEMENT_REPOSITORY) private readonly announcementRepository: AnnouncementRepository,
    private readonly usersService: UsersService,
    private readonly eventEmitter: EventEmitter2,
    private readonly messagePersonalizationService: MessagePersonalizationService,
  ) {}

  private async resolveRecipientUserIds(publico: AnnouncementAudience): Promise<string[]> {
    switch (publico) {
      case AnnouncementAudience.TODOS:
        return this.usersService.listAllActiveUserIds();
      case AnnouncementAudience.EMPRESAS:
        return this.usersService.listActiveUserIdsByRoles([Role.EMPRESA, Role.GESTOR]);
      case AnnouncementAudience.MOTORISTAS_MONITORES:
        return this.usersService.listActiveUserIdsByRoles([Role.MOTORISTA, Role.MONITOR]);
      case AnnouncementAudience.RESPONSAVEIS:
        return this.usersService.listResponsavelUserIds();
    }
  }

  /** Best-effort — cada falha individual só é logada, nunca interrompe o fan-out dos demais destinatários. */
  private notifyRecipients(userIds: string[], titulo: string, corpo: string, announcementId: string): void {
    const mensagem = this.messagePersonalizationService.avisoGeral(titulo, corpo);
    for (const userId of userIds) {
      try {
        this.eventEmitter.emit(COMMUNICATION_REQUESTED_EVENT, {
          userId,
          tipo: "AVISO_GERAL",
          titulo: mensagem.titulo,
          corpo: mensagem.corpo,
          dadosContexto: { announcementId },
        });
      } catch (error) {
        this.logger.warn(`Falha ao notificar o usuário ${userId} sobre o aviso ${announcementId}.`);
        this.logger.warn(error instanceof Error ? error.message : String(error));
      }
    }
  }

  async create(
    dto: CreateAnnouncementDto,
    actor: AuthenticatedUser,
  ): Promise<AnnouncementResponseDto> {
    const recipientUserIds = await this.resolveRecipientUserIds(dto.publico);

    const announcement = await this.announcementRepository.create({
      titulo: dto.titulo,
      corpo: dto.corpo,
      publico: dto.publico,
      criadoPorUserId: actor.sub,
      destinatariosCount: recipientUserIds.length,
    });

    this.notifyRecipients(recipientUserIds, dto.titulo, dto.corpo, announcement.id);

    return toAnnouncementResponseDto(announcement);
  }

  async list(query: ListAnnouncementsQueryDto): Promise<ListAnnouncementsResponseDto> {
    const { items, total } = await this.announcementRepository.list({
      page: query.page,
      pageSize: query.pageSize,
    });

    return {
      items: items.map(toAnnouncementResponseDto),
      total,
      page: query.page,
      pageSize: query.pageSize,
    };
  }
}
