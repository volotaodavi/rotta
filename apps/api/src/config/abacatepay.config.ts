import { registerAs } from "@nestjs/config";

export interface AbacatePayConfig {
  apiKey: string | undefined;
  baseUrl: string;
  /** Confere o `?webhookSecret=` da URL registrada no dashboard da AbacatePay (Dossiê 26, ver `abacatepay-webhook.controller.ts`). */
  webhookSecret: string | undefined;
}

const DEFAULT_BASE_URL = "https://api.abacatepay.com/v2";

/**
 * Configuração da AbacatePay (abacatepay.com) — provedora de pagamento
 * que processa a mensalidade da Rotta (Dossiê 26, R$ 39,90/mês; nunca a
 * confundir com o Rotta Pay/WalletModule, que é a transportadora
 * RECEBENDO dos responsáveis — esta aqui é a Rotta COBRANDO da
 * transportadora). `apiKey`/`webhookSecret` opcionais: sem eles, a
 * aplicação sobe normalmente e `AbacatePayService` recusa a chamada com
 * um erro claro (mesmo padrão de `LytexConfig`/`DiditConfig`) — nunca
 * finge uma cobrança que não existe.
 */
export default registerAs("abacatepay", (): AbacatePayConfig => ({
  apiKey: process.env.ABACATEPAY_API_KEY || undefined,
  baseUrl: process.env.ABACATEPAY_BASE_URL || DEFAULT_BASE_URL,
  webhookSecret: process.env.ABACATEPAY_WEBHOOK_SECRET || undefined,
}));
