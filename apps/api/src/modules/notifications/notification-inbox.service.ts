import { Inject, Injectable, Logger, NotFoundException } from "@nestjs/common";

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

import { AuditLogService } from "@/modules/audit/audit-log.service";

const ENTIDADE_TIPO = "Notification";

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
  private readonly logger = new Logger(NotificationInboxService.name);

  constructor(
    @Inject(NOTIFICATION_REPOSITORY)
    private readonly notificationRepository: NotificationRepository,
    @Inject(DEVICE_TOKEN_REPOSITORY)
    private readonly deviceTokenRepository: DeviceTokenRepository,
    @Inject(NOTIFICATION_PREFERENCE_REPOSITORY)
    private readonly preferenceRepository: NotificationPreferenceRepository,
    private readonly auditLogService: AuditLogService,
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

  /**
   * `notification` já vem carregada do `findByIdOrThrow` que o
   * controller chama antes (mesmo dado, nunca uma segunda consulta só
   * para popular `dadosAntes`) — exclusão é permanente, então é o único
   * ponto deste service que audita (marcar lida/favoritar/arquivar são
   * toggles de alta frequência sem valor de trilha, mesmo raciocínio de
   * nunca poluir `AuditLog` com ruído de UI). Nunca passa `companyId`
   * mesmo quando `notification.companyId` existe: é sempre uma ação
   * PESSOAL do destinatário sobre o próprio inbox (mesmo raciocínio de
   * `StudentsService.recordAudit`), nunca uma escrita de tenant — se
   * passasse, `AuditLogService.record` tentaria `withTenant` com o
   * `TenantContext` do ATOR (que pode ser `null`/outra empresa,
   * ex. Responsável apagando uma notificação de contrato de uma
   * empresa que não é o "tenant" dele), violando a RLS de `audit_logs`.
   */
  async delete(notification: Notification, userId: string): Promise<void> {
    await this.notificationRepository.delete(notification.id, userId);
    await this.recordAudit({
      entidadeId: notification.id,
      acao: "NOTIFICATION_DELETED",
      atorUserId: userId,
      dadosAntes: { tipo: notification.tipo, titulo: notification.titulo },
    });
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

  /** Auditado (nunca um toggle silencioso): muda o que o usuário efetivamente recebe (Quiet Hours/canais), relevante para reconstituir "por que uma notificação não chegou" numa investigação futura. */
  async updatePreference(userId: string, data: Omit<UpsertNotificationPreferenceData, "userId">) {
    const updated = await this.preferenceRepository.upsert({ userId, ...data });
    await this.recordAudit({
      entidadeId: userId,
      acao: "NOTIFICATION_PREFERENCE_UPDATED",
      atorUserId: userId,
      dadosDepois: { ...data },
    });
    return updated;
  }

  /**
   * Auditoria é sempre best-effort em relação à operação principal —
   * mesmo princípio de `NotificationsService.recordAudit`. Nunca recebe
   * `companyId` (ver nota em `delete`): todo registro aqui é sobre uma
   * ação do próprio usuário no próprio inbox/preferência, então sempre
   * grava via bypass (`AuditLogService.record` sem `companyId`).
   */
  private async recordAudit(input: {
    entidadeId: string;
    acao: string;
    atorUserId: string;
    dadosAntes?: Record<string, unknown>;
    dadosDepois?: Record<string, unknown>;
  }): Promise<void> {
    try {
      await this.auditLogService.record({ ...input, entidadeTipo: ENTIDADE_TIPO });
    } catch (error) {
      this.logger.warn(
        `Falha ao registrar auditoria (Notification ${input.entidadeId}, ação ${input.acao})`,
      );
      this.logger.warn(error instanceof Error ? error.message : String(error));
    }
  }
}
