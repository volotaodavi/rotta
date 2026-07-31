import { Module } from "@nestjs/common";

/**
 * Modulo Notifications (Dossie 13, Secao 13) — preferencias, historico e
 * disparo de comunicados em massa. O envio efetivo multicanal (push,
 * WhatsApp, SMS, e-mail) e orquestrado pelo Worker (Dossie 14, Secao 2),
 * consumindo as filas definidas em `infra/queue/queue.constants.ts`.
 *
 * ESTADO ATUAL: modulo vazio (fase de fundacao).
 */
@Module({})
export class NotificationsModule {}
