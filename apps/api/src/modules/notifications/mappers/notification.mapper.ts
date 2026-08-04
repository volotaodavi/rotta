import type { NotificationResponseDto } from "../dto/notification-response.dto";
import type { Notification, Prisma } from "@prisma/client";

/** `Notification` (Prisma) → `NotificationResponseDto` — nunca vaza `userId`/`companyId` (o dono já é implícito na sessão que chamou). */
export function toNotificationResponseDto(notification: Notification): NotificationResponseDto {
  return {
    id: notification.id,
    tipo: notification.tipo,
    prioridade: notification.prioridade,
    titulo: notification.titulo,
    corpo: notification.corpo,
    dadosContexto: (notification.dadosContexto as Prisma.JsonObject | null) ?? null,
    canaisEscolhidos: notification.canaisEscolhidos,
    lida: notification.lida,
    lidaEm: notification.lidaEm,
    favoritada: notification.favoritada,
    arquivada: notification.arquivada,
    createdAt: notification.createdAt,
  };
}
