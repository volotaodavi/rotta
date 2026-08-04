export interface SmsSendInput {
  /** Telefone do destinatário em formato E.164 (ex. `"+5511999999999"`). */
  to: string;
  texto: string;
}

export interface SmsSendResult {
  /** ID da mensagem devolvido pelo provedor — guardado para auditoria/depuração, nunca usado para lógica de negócio. */
  providerMessageId: string;
}

/**
 * Contrato que TODO provedor de SMS implementa (briefing — "totalmente
 * desacoplada"). `SmsService` nunca conhece o provedor concreto — só
 * resolve qual usar via `sms.config.ts#provider`. Mesmo padrão de
 * `WhatsAppProvider`/`ChannelSender`: trocar de fornecedor é uma nova
 * classe + um registro em `SmsModule`, nunca uma reescrita de
 * `SmsChannelSender`.
 */
export interface SmsProvider {
  readonly name: string;
  send(input: SmsSendInput): Promise<SmsSendResult>;
}
