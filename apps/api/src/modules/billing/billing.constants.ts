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

/** 30 minutos — tempo generoso pra pagar o Pix sem expirar no meio do preenchimento. */
export const ABACATEPAY_PIX_EXPIRES_IN_SECONDS = 30 * 60;

/**
 * Taxas públicas da AbacatePay (abacatepay.com/pricing, consultado em
 * 2026-08 — Dossiê 26 extensão "painel financeiro do Admin"): Pix R$
 * 0,80 por transação paga, Cartão 3,5% + R$ 0,60. Usadas pra calcular
 * "taxa retida" no painel financeiro de forma determinística — não
 * dependemos de nenhum campo `fee` da API (o contrato do `billing/list`
 * não foi testado com uma chave real, ver `abacatepay.types.ts`), então
 * calculamos a mesma conta que a AbacatePay já publica pro cliente
 * final. Se o preço público mudar, só este arquivo precisa atualizar.
 */
export const ABACATEPAY_FEE_PIX_CENTS = 80;
export const ABACATEPAY_FEE_CARD_PERCENT = 0.035;
export const ABACATEPAY_FEE_CARD_FIXED_CENTS = 60;
