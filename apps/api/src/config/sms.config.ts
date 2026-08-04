import { registerAs } from "@nestjs/config";

export interface SmsConfig {
  /** Nome do provedor ativo (`SmsService` resolve por este valor) — permite trocar de fornecedor só mudando uma variável de ambiente. */
  provider: string;
  accountSid: string | undefined;
  authToken: string | undefined;
  fromNumber: string | undefined;
}

const DEFAULT_PROVIDER = "twilio";

/**
 * Configuração do canal SMS (briefing — "Preparar arquitetura para
 * integração com provedores de SMS, totalmente desacoplada"). Mesmo
 * raciocínio de `whatsapp.config.ts`: `provider` seleciona a
 * implementação ativa entre as registradas em `SmsModule`; hoje só a
 * Twilio está implementada.
 *
 * Todas as 3 credenciais opcionais: sem elas, a aplicação sobe
 * normalmente e `SmsService` recusa o envio com um erro claro (mesmo
 * padrão de `storage.config.ts`/`fcm.config.ts`/`whatsapp.config.ts`).
 */
export default registerAs("sms", (): SmsConfig => ({
  provider: process.env.SMS_PROVIDER || DEFAULT_PROVIDER,
  accountSid: process.env.TWILIO_ACCOUNT_SID || undefined,
  authToken: process.env.TWILIO_AUTH_TOKEN || undefined,
  fromNumber: process.env.TWILIO_FROM_NUMBER || undefined,
}));
