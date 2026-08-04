import type { CommunicationChannel, Notification } from "@prisma/client";

export interface ChannelSendInput {
  notification: Notification;
  /** Token FCM/telefone/e-mail de destino — resolvido pelo `NotificationsService` antes de chamar o sender (o sender nunca resolve o próprio destinatário). */
  destino?: string;
}

export interface ChannelSendResult {
  /** Nome do provedor real que processou o envio (ex. `"fcm"`) — usado em `NotificationDeliveryAttempt.provedor`. */
  provedor: string;
  entregueImediatamente: boolean;
}

/**
 * Contrato único que TODO canal de comunicação implementa (briefing
 * "ROTTA COMMUNICATION ENGINE" — "Arquitetura deve permitir adicionar
 * novos canais futuramente"). Nenhum módulo de negócio, processor ou
 * controller chama um provedor externo (FCM/WhatsApp/SMS/e-mail)
 * diretamente — sempre através de um `ChannelSender` resolvido pelo
 * `ChannelRegistryService`. Adicionar um canal novo é, deliberadamente,
 * só escrever uma nova classe que implementa esta interface e registrá-
 * la em `NotificationsModule` — nunca uma alteração no núcleo do
 * `NotificationsService`.
 */
export interface ChannelSender {
  readonly channel: CommunicationChannel;
  send(input: ChannelSendInput): Promise<ChannelSendResult>;
}
