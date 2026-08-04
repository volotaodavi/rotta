import type {
  CommunicationChannel,
  NotificationDeliveryAttempt,
  NotificationDeliveryStatus,
} from "@prisma/client";

export interface CreateDeliveryAttemptData {
  notificationId: string;
  canal: CommunicationChannel;
  status: NotificationDeliveryStatus;
  tentativa?: number;
}

export interface UpdateDeliveryAttemptData {
  status: NotificationDeliveryStatus;
  provedor?: string;
  erro?: string;
  enviadoEm?: Date;
  entregueEm?: Date;
  lidaEm?: Date;
  tempoRespostaMs?: number;
}

/**
 * `notification_delivery_attempts` NÃO tem RLS própria (herda o dono da
 * `Notification` já referenciada — ver nota de RLS na migration) — todo
 * método aqui usa `this.prisma` direto, nunca `withTenant`/`withBypass`
 * (mesmo padrão de `student_authorized_persons`).
 */
export interface DeliveryStatsByCompanyRow {
  canal: CommunicationChannel;
  status: NotificationDeliveryStatus;
  total: number;
  tempoRespostaMedioMs: number | null;
}

export interface NotificationDeliveryAttemptRepository {
  create(data: CreateDeliveryAttemptData): Promise<NotificationDeliveryAttempt>;
  update(id: string, data: UpdateDeliveryAttemptData): Promise<NotificationDeliveryAttempt>;
  findById(id: string): Promise<NotificationDeliveryAttempt | null>;
  listByNotification(notificationId: string): Promise<NotificationDeliveryAttempt[]>;
  /**
   * Quebra por canal/status do dashboard de comunicação (briefing "AGENTE
   * 03 — Delivery AI"), agrupada via `notification.companyId` (esta
   * tabela em si não tem `companyId` próprio nem RLS — ver nota da
   * interface). Chamado só por `NotificationDashboardService`, que já
   * roda dentro do `TenantContext` do `companyId` verificado por RBAC.
   */
  statsByCompany(companyId: string, filter: { desde?: Date }): Promise<DeliveryStatsByCompanyRow[]>;
}
