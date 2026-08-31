import { registerAs } from "@nestjs/config";

export interface EmailConfig {
  /** Nome do provedor ativo (`EmailService` resolve por este valor) — permite trocar/adicionar fornecedor (briefing — "permitir múltiplos provedores") só mudando uma variável de ambiente. */
  provider: string;
  apiKey: string | undefined;
  fromAddress: string;
  fromName: string;
}

const DEFAULT_PROVIDER = "resend";
/**
 * `rottabr.com.br` é o domínio oficial da Rotta (confirmado pelo
 * usuário 31/08/2026) — antes disso o default apontava para
 * `rotta.com.br`, um domínio que nunca pertenceu à Rotta (página de
 * revenda de terceiro). Sobrescrevível por `EMAIL_FROM_ADDRESS`, mas só
 * funciona de verdade depois que este domínio for verificado no
 * provedor de e-mail ativo (Resend → Domains → adicionar
 * `rottabr.com.br` → configurar os registros SPF/DKIM/DMARC que a
 * Resend fornece) — sem essa verificação, a Resend rejeita o envio.
 */
const DEFAULT_FROM_ADDRESS = "notificacoes@rottabr.com.br";
const DEFAULT_FROM_NAME = "Rotta";

/**
 * Configuração do canal E-mail (briefing — "Criar serviço de envio de
 * e-mails, templates HTML responsivos, permitir múltiplos provedores").
 * `provider` seleciona a implementação ativa entre as registradas em
 * `EmailModule`; hoje só a Resend (https://resend.com/docs/api-reference/emails/send-email)
 * está implementada — um provedor futuro (SES, SendGrid, Postmark) é
 * uma nova classe `EmailProvider` + um registro no módulo, nunca uma
 * reescrita do `EmailChannelSender`.
 *
 * `apiKey` opcional: sem ela, a aplicação sobe normalmente e
 * `EmailService` recusa o envio com um erro claro (mesmo padrão de
 * `fcm.config.ts`/`whatsapp.config.ts`/`sms.config.ts`).
 */
export default registerAs("email", (): EmailConfig => ({
  provider: process.env.EMAIL_PROVIDER || DEFAULT_PROVIDER,
  apiKey: process.env.EMAIL_API_KEY || undefined,
  fromAddress: process.env.EMAIL_FROM_ADDRESS || DEFAULT_FROM_ADDRESS,
  fromName: process.env.EMAIL_FROM_NAME || DEFAULT_FROM_NAME,
}));
