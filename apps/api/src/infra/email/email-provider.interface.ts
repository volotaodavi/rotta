/**
 * Categoria do remetente (pedido do usuário 03/09/2026:
 * "financeiro@rottabr.com.br, suporte@rottabr.com.br... quero colocar
 * pra enviar e-mails com esses dois também") — `EmailService` resolve
 * cada categoria pro endereço/nome configurado em `email.config.ts`.
 * `"notificacoes"` é o genérico de sempre (default quando nenhuma
 * categoria é passada) — nenhum chamador existente precisou mudar.
 */
export type EmailRemetente = "notificacoes" | "financeiro" | "suporte";

export interface EmailSendInput {
  to: string;
  subject: string;
  html: string;
  /** Remetente já resolvido (endereço + nome) — `EmailService` decide, o provedor só usa. */
  from: {
    address: string;
    name: string;
  };
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
