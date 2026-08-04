export interface WhatsAppSendInput {
  /** Telefone do destinatário em formato E.164 (ex. `"+5511999999999"`). */
  to: string;
  texto: string;
}

export interface WhatsAppSendResult {
  /** ID da mensagem devolvido pelo provedor — guardado para auditoria/depuração, nunca usado para lógica de negócio. */
  providerMessageId: string;
}

/**
 * Contrato que TODO provedor de WhatsApp Business API implementa
 * (briefing — "camada de abstração para trocar de fornecedor
 * futuramente"). `WhatsAppService` nunca conhece o provedor concreto —
 * só resolve qual usar via `WhatsAppProviderRegistryService` +
 * `whatsapp.config.ts#provider`. Trocar de fornecedor (Meta Cloud API →
 * Twilio/360dialog) é, deliberadamente, uma nova classe que implementa
 * esta interface + um registro em `WhatsappModule`, nunca uma reescrita
 * do `WhatsappChannelSender`.
 */
export interface WhatsAppProvider {
  readonly name: string;
  send(input: WhatsAppSendInput): Promise<WhatsAppSendResult>;
}
