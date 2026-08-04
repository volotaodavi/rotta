import { registerAs } from "@nestjs/config";

export interface WhatsappConfig {
  /** Nome do provedor ativo (`WhatsAppProviderRegistryService` resolve por este valor) — permite trocar de fornecedor só mudando uma variável de ambiente. */
  provider: string;
  accessToken: string | undefined;
  phoneNumberId: string | undefined;
  apiVersion: string;
}

const DEFAULT_PROVIDER = "meta-cloud-api";
const DEFAULT_API_VERSION = "v21.0";

/**
 * Configuração do canal WhatsApp (briefing — "Preparar arquitetura para
 * integração com WhatsApp Business API, através de provedores oficiais,
 * com camada de abstração para trocar de fornecedor futuramente").
 * `provider` é o nome do provedor ativo — hoje só `"meta-cloud-api"`
 * (API oficial da Meta, https://developers.facebook.com/docs/whatsapp/cloud-api)
 * está implementado; um provedor futuro (ex. Twilio, 360dialog) é uma
 * nova classe `WhatsAppProvider` registrada em `WhatsappModule` e
 * selecionável só trocando esta variável.
 *
 * `accessToken`/`phoneNumberId` opcionais: sem eles, a aplicação sobe
 * normalmente e `WhatsAppService` recusa o envio com um erro claro
 * (mesmo padrão de `storage.config.ts`/`fcm.config.ts`).
 */
export default registerAs("whatsapp", (): WhatsappConfig => ({
  provider: process.env.WHATSAPP_PROVIDER || DEFAULT_PROVIDER,
  accessToken: process.env.WHATSAPP_ACCESS_TOKEN || undefined,
  phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || undefined,
  apiVersion: process.env.WHATSAPP_API_VERSION || DEFAULT_API_VERSION,
}));
