import { registerAs } from "@nestjs/config";

export interface AsaasConfig {
  apiKey: string | undefined;
  baseUrl: string;
  /** Confere o header `asaas-access-token` que o webhook cadastrado no dashboard da Asaas envia (Dossiê 26, ver `asaas-webhook.guard.ts`). Valor escolhido por nós, não pela Asaas. */
  webhookToken: string | undefined;
}

/**
 * Configuração da Asaas (asaas.com) — provedora de pagamento que
 * processa cartão de crédito, débito e boleto da mensalidade da Rotta
 * (Dossiê 26, R$ 39,90/mês; Pix continua na AbacatePay,
 * `abacatepay.config.ts`). `apiKey`/`webhookToken` opcionais: sem eles,
 * a aplicação sobe normalmente e `AsaasClientService` recusa a chamada
 * com um erro claro (mesmo padrão "stub honesto" de `AbacatePayConfig`/
 * `LytexConfig`) — nunca finge uma cobrança que não existe.
 */
export default registerAs("asaas", (): AsaasConfig => ({
  apiKey: process.env.ASAAS_API_KEY || undefined,
  baseUrl: process.env.ASAAS_BASE_URL || "https://api-sandbox.asaas.com/v3",
  webhookToken: process.env.ASAAS_WEBHOOK_TOKEN || undefined,
}));
