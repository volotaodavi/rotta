import { Inject, Injectable, NotFoundException } from "@nestjs/common";

import {
  DEVICE_TOKEN_REPOSITORY,
  NOTIFICATION_PREFERENCE_REPOSITORY,
  NOTIFICATION_REPOSITORY,
} from "./notifications.constants";

import type { DeviceTokenRepository } from "./repositories/device-token.repository";
import type {
  NotificationPreferenceRepository,
  UpsertNotificationPreferenceData,
} from "./repositories/notification-preference.repository";
import type {
  ListNotificationsFilter,
  ListNotificationsResult,
  NotificationRepository,
} from "./repositories/notification.repository";
import type { DeviceToken, DeviceTokenPlatform, Notification } from "@prisma/client";

/**
 * Central de Notificações Internas (briefing "NOTIFICAÇÕES INTERNAS" —
 * "Cada usuário possui seu próprio histórico. Permitir: Marcar como
 * lida, Marcar todas como lidas, Favoritar, Arquivar, Excluir,
 * Pesquisar, Filtrar"). Serviço separado de `NotificationsService`
 * (que só ENVIA) porque este aqui é o lado de LEITURA/GESTÃO do próprio
 * inbox pelo usuário autenticado — nenhum outro módulo o injeta, só o
 * `NotificationsController`.
 *
 * Também expõe registro/renovação de `DeviceToken` (briefing "PUSH
 * NOTIFICATION") e preferências de canal/Quiet Hours (briefing
 * "CONFIGURAÇÕES"/"QUIET HOURS") — mesma justificativa: dado pessoal do
 * usuário, gerenciado por ele mesmo via HTTP.
 */
@Injectable()
export class NotificationInboxService {
  constructor(
    @Inject(NOTIFICATION_REPOSITORY)
    private readonly notificationRepository: NotificationRepository,
    @Inject(DEVICE_TOKEN_REPOSITORY)
    private readonly deviceTokenRepository: DeviceTokenRepository,
    @Inject(NOTIFICATION_PREFERENCE_REPOSITORY)
    private readonly preferenceRepository: NotificationPreferenceRepository,
  ) {}

  list(
    userId: string,
    filter: Omit<ListNotificationsFilter, "userId">,
  ): Promise<ListNotificationsResult> {
    return this.notificationRepository.list({ ...filter, userId });
  }

  async findByIdOrThrow(id: string, userId: string): Promise<Notification> {
    const notification = await this.notificationRepository.findByIdForUser(id, userId);
    if (!notification) {
      throw new NotFoundException("Notificação não encontrada.");
    }
    return notification;
  }

  markRead(id: string, userId: string): Promise<Notification> {
    return this.notificationRepository.markRead(id, userId);
  }

  markAllRead(userId: string): Promise<{ count: number }> {
    return this.notificationRepository.markAllRead(userId).then((count) => ({ count }));
  }

  setFavorita(id: string, userId: string, favoritada: boolean): Promise<Notification> {
    return this.notificationRepository.setFavorita(id, userId, favoritada);
  }

  setArquivada(id: string, userId: string, arquivada: boolean): Promise<Notification> {
    return this.notificationRepository.setArquivada(id, userId, arquivada);
  }

  delete(id: string, userId: string): Promise<void> {
    return this.notificationRepository.delete(id, userId);
  }

  registerDeviceToken(
    userId: string,
    token: string,
    plataforma: DeviceTokenPlatform,
  ): Promise<DeviceToken> {
    return this.deviceTokenRepository.upsertByToken({ userId, token, plataforma });
  }

  deactivateDeviceToken(token: string): Promise<void> {
    return this.deviceTokenRepository.deactivate(token);
  }

  async getPreference(userId: string) {
    const preference = await this.preferenceRepository.findByUser(userId);
    return (
      preference ?? {
        userId,
        receberPush: true,
        receberWhatsapp: true,
        receberSms: true,
        receberEmail: true,
        silenciarFinsDeSemana: false,
        quietHoursInicio: null,
        quietHoursFim: null,
      }
    );
  }

  updatePreference(userId: string, data: Omit<UpsertNotificationPreferenceData, "userId">) {
    return this.preferenceRepository.upsert({ userId, ...data });
  }
}
