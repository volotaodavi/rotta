/** Tokens de injeção de dependência do módulo Communication (Repository Pattern, Dossiê 12 Seção 6.1). */
export const NOTIFICATION_REPOSITORY = Symbol("NOTIFICATION_REPOSITORY");
export const NOTIFICATION_DELIVERY_ATTEMPT_REPOSITORY = Symbol(
  "NOTIFICATION_DELIVERY_ATTEMPT_REPOSITORY",
);
export const DEVICE_TOKEN_REPOSITORY = Symbol("DEVICE_TOKEN_REPOSITORY");
export const NOTIFICATION_PREFERENCE_REPOSITORY = Symbol("NOTIFICATION_PREFERENCE_REPOSITORY");

/**
 * Token do array de `ChannelSender` injetados (um provider por canal,
 * `multi: true`) — o `ChannelRegistryService` resolve qual usar em
 * runtime a partir de `CommunicationChannel`. Novo canal futuro
 * (briefing "Arquitetura deve permitir adicionar novos canais
 * futuramente") = novo provider registrado aqui, nunca uma alteração no
 * registry.
 */
export const CHANNEL_SENDERS = Symbol("CHANNEL_SENDERS");
