/**
 * Tipos do contrato REAL da API da AbacatePay v2 (Dossiê 26) —
 * verificados em docs.abacatepay.com e por chamadas reais à API com a
 * chave de produção fornecida (`GET /products/list` retornou 200 com
 * dados reais). Deliberadamente NÃO cobrem 100% dos campos de resposta
 * — só os que este módulo de fato lê (best practice da própria
 * AbacatePay: não fazer validação de schema estrita, pois novos campos
 * podem ser adicionados sem aviso).
 */

/** Envelope de resposta de TODO endpoint da AbacatePay v2. */
export interface AbacatePayEnvelope<T> {
  data: T | null;
  success: boolean;
  error: string | null;
}

export interface AbacatePayProduct {
  id: string;
  externalId: string;
  name: string;
  price: number;
  currency: "BRL";
  status?: string;
  cycle?: "WEEKLY" | "MONTHLY" | "QUARTERLY" | "SEMIANNUALLY" | "ANNUALLY" | null;
}

export interface CreateProductInput {
  externalId: string;
  name: string;
  price: number;
  currency: "BRL";
  description?: string;
  cycle?: "WEEKLY" | "MONTHLY" | "QUARTERLY" | "SEMIANNUALLY" | "ANNUALLY";
}

export interface CreateSubscriptionCheckoutInput {
  items: Array<{ id: string; quantity: number }>;
  externalId: string;
  returnUrl: string;
  completionUrl: string;
  methods?: Array<"PIX" | "CARD">;
}

export interface AbacatePaySubscriptionCheckout {
  id: string;
  externalId: string | null;
  url: string;
  amount: number;
  status: "PENDING" | "EXPIRED" | "CANCELLED" | "PAID" | "REFUNDED";
}

/** Envelope compartilhado por todos os webhooks v2 da AbacatePay. */
export interface AbacatePayWebhookEnvelope {
  id: string;
  event: string;
  apiVersion: string;
  devMode: boolean;
  data: AbacatePaySubscriptionWebhookData;
}

/**
 * Formato de `data` específico dos eventos `subscription.*` (Dossiê
 * 26) — capturado literalmente da documentação
 * `webhooks/events/subscriptions`. `checkout.externalId` é a chave de
 * correlação: setamos `externalId: company.id` ao criar o checkout
 * (`abacatepay-client.service.ts`), e a AbacatePay ecoa esse valor de
 * volta aqui em todo webhook subsequente — nunca precisamos de outra
 * consulta para achar a `Company` certa.
 */
export interface AbacatePaySubscriptionWebhookData {
  subscription?: {
    id: string;
    status: "ACTIVE" | "CANCELLED";
    cancelledDueTo?: string | null;
  };
  checkout?: {
    id: string;
    externalId: string | null;
    status: string;
  };
  payment?: {
    id: string;
    status: string;
  };
  retryNumber?: number;
}
