export interface EmailSendInput {
  to: string;
  subject: string;
  html: string;
}

export interface EmailSendResult {
  /** ID da mensagem devolvido pelo provedor — guardado para auditoria/depuração, nunca usado para lógica de negócio. */
  providerMessageId: string;
}

/**
 * Contrato que TODO provedor de e-mail implementa (briefing — "permitir
 * múltiplos provedores"). `EmailService` nunca conhece o provedor
 * concreto — só resolve qual usar via `email.config.ts#provider`. Mesmo
 * padrão de `WhatsAppProvider`/`SmsProvider`: trocar/adicionar
 * fornecedor é uma nova classe + um registro em `EmailModule`, nunca uma
 * reescrita de `EmailChannelSender`.
 */
export interface EmailProvider {
  readonly name: string;
  send(input: EmailSendInput): Promise<EmailSendResult>;
}
