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
export interface NotificationDeliveryAttemptRepository {
  create(data: CreateDeliveryAttemptData): Promise<NotificationDeliveryAttempt>;
  update(id: string, data: UpdateDeliveryAttemptData): Promise<NotificationDeliveryAttempt>;
  findById(id: string): Promise<NotificationDeliveryAttempt | null>;
  listByNotification(notificationId: string): Promise<NotificationDeliveryAttempt[]>;
}
