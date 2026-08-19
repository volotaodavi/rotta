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

/**
 * `POST /pixQrCode/create` e `GET /pixQrCode/check` — ao contrário do
 * checkout de assinatura (`/subscriptions/create`, que só devolve uma
 * `url` pra página hospedada), este endpoint devolve o QR Code e o
 * código copia-e-cola DIRETO na resposta — é o único jeito real de
 * cobrar sem sair da Rotta (pedido do usuário: "para não precisar ir em
 * outro lugar"). Cartão continua exigindo o checkout hospedado (limite
 * real de qualquer processadora sem tokenização de cartão própria —
 * não é uma limitação inventada, ver `createCheckoutForCompany`).
 *
 * ATENÇÃO: ao contrário de `AbacatePayProduct`/`AbacatePaySubscriptionCheckout`
 * (contrato confirmado com chamadas reais numa conta de produção, ver
 * nota no topo do arquivo), este contrato foi levantado só pela
 * documentação pública (`docs.abacatepay.com/api-reference/criar-qrcode-pix`)
 * — nenhuma chamada real foi feita ainda (não há `ABACATEPAY_API_KEY`
 * neste ambiente de desenvolvimento). `IntegrationHealthService` vai
 * registrar qualquer divergência de contrato assim que a primeira
 * chamada real acontecer em produção.
 */
export interface AbacatePayPixQrCode {
  id: string;
  amount: number;
  status: "PENDING" | "EXPIRED" | "CANCELLED" | "PAID" | "REFUNDED";
  /** Código copia-e-cola do Pix. */
  brCode: string;
  /** Imagem do QR Code em base64 (`data:image/png;base64,...` ou só o base64 puro, conforme a doc). */
  brCodeBase64: string;
  /** Taxa retida pela AbacatePay nesta cobrança, em centavos — ausente até o pagamento ser confirmado. */
  fee?: number;
  expiresAt: string;
  createdAt: string;
}

export interface CreatePixQrCodeInput {
  amount: number;
  /** Segundos até expirar — a Rotta usa um valor generoso (ver `billing.constants.ts`) pra não expirar no meio do preenchimento. */
  expiresIn?: number;
  description?: string;
  /** Ecoado de volta no webhook — mesmo papel do `externalId` do checkout de assinatura (`company.id`). */
  metadata?: { externalId?: string };
}

/**
 * `GET /billing/list` — histórico de cobranças da conta (assinaturas E
 * cobranças avulsas de Pix), usado só pelo painel financeiro do Admin
 * Rotta (`BillingService.getAdminOverview`) pra somar valores recebidos
 * de verdade. Mesma ressalva de contrato-não-testado do
 * `AbacatePayPixQrCode` acima.
 */
export interface AbacatePayBilling {
  id: string;
  status: "PENDING" | "EXPIRED" | "CANCELLED" | "PAID" | "REFUNDED";
  amount: number;
  methods?: Array<"PIX" | "CARD">;
  frequency?: string;
  createdAt?: string;
  paidAt?: string | null;
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
  data: AbacatePaySubscriptionWebhookData & AbacatePayOneTimeBillingWebhookData;
}

/**
 * Campos do evento `billing.paid` (cobrança avulsa, ex. o Pix embutido
 * de `createPixCheckoutForCompany`) — o nome do evento foi confirmado
 * (docs.abacatepay.com/pages/webhooks: "billing.paid" corresponde a
 * "pagamento confirmado" no dashboard), mas o formato exato de `data`
 * NÃO foi testado com uma conta real (mesma ressalva de
 * `AbacatePayPixQrCode`) — por isso `BillingService.applyPixPayment`
 * tenta mais de um caminho plausível pra achar o `externalId` de volta,
 * em vez de confiar cegamente num único campo.
 */
export interface AbacatePayOneTimeBillingWebhookData {
  billing?: { id: string; status?: string; metadata?: { externalId?: string } };
  pixQrCode?: { id: string; status?: string; metadata?: { externalId?: string } };
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
