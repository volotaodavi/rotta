/**
 * Módulo Billing (Dossiê 26) — a Rotta COBRANDO a mensalidade das
 * empresas/transportadoras/autônomos via AbacatePay. Nunca confundir
 * com `WalletModule` (a transportadora RECEBENDO dos responsáveis).
 *
 * O Responsável NÃO tem plano e é 100% gratuito — este módulo nunca é
 * acionado para `Role.RESPONSAVEL` (nenhuma rota/serviço aqui aceita
 * esse papel; ver `billing.controller.ts`).
 */

/**
 * `externalId` do produto de assinatura da Rotta na AbacatePay — usado
 * para localizar/criar o produto certo em `GET /products/list` sem
 * colidir com produtos de outros negócios que já existirem na mesma
 * conta (a chave fornecida já tinha produtos de um negócio diferente,
 * "StationCell Pro", confirmado ao verificar a chave).
 */
export const ROTTA_SUBSCRIPTION_PRODUCT_EXTERNAL_ID = "rotta-mensalidade-plataforma";

/** Mesmo valor de `DEFAULT_PLAN.priceCents` (Companies) — nunca duplicar o número em outro lugar. */
export const ROTTA_SUBSCRIPTION_PRICE_CENTS = 3990;

export const ROTTA_SUBSCRIPTION_PRODUCT_NAME = "Rotta — Mensalidade da Plataforma";

/**
 * Chave pública FIXA da AbacatePay para verificação HMAC de webhooks —
 * copiada literalmente de docs.abacatepay.com/pages/webhooks (Dossiê
 * 26). Não é um segredo por conta: é a mesma constante documentada para
 * todos os clientes da AbacatePay, usada como segunda camada de defesa
 * além do `?webhookSecret=` da URL (que esse sim é escolhido por nós).
 */
export const ABACATEPAY_HMAC_PUBLIC_KEY =
  "t9dXRhHHo3yDEj5pVDYz0frf7q6bMKyMRmxxCPIPp3RCplBfXRxqlC6ZpiWmOqj4L63qEaeUOtrCI8P0VMUgo6iIga2ri9ogaHFs0WIIywSMg0q7RmBfybe1E5XJcfC4IW3alNqym0tXoAKkzvfEjZxV6bE0oG2zJrNNYmUCKZyV0KZ3JS8Votf9EAWWYdiDkMkpbMdPggfh1EqHlVkMiTady6jOR3hyzGEHrIz2Ret0xHKMbiqkr9HS1JhNHDX9";

export const ABACATEPAY_CLIENT_TOKEN = Symbol("ABACATEPAY_CLIENT");
