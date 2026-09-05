/**
 * Módulo Billing (Dossiê 26) — a Rotta COBRANDO a mensalidade das
 * empresas/transportadoras/autônomos, 100% via Asaas (pedido do usuário
 * 05/09/2026: "Nós usaremos 100% Asaas, esquece a AbacatePay" — a
 * AbacatePay já vinha em desuso desde 03/09/2026, com a chave inválida
 * em produção e todo checkout novo caindo em fallback pra Asaas; esta
 * migração remove o código, não muda comportamento real de produção).
 * Nunca confundir com `WalletModule` (a transportadora RECEBENDO dos
 * responsáveis).
 *
 * O Responsável NÃO tem plano e é 100% gratuito — este módulo nunca é
 * acionado para `Role.RESPONSAVEL` (nenhuma rota/serviço aqui aceita
 * esse papel; ver `billing.controller.ts`).
 */

/** Mesmo valor de `DEFAULT_PLAN.priceCents` (Companies) — nunca duplicar o número em outro lugar. */
export const ROTTA_SUBSCRIPTION_PRICE_CENTS = 3990;

export const ROTTA_SUBSCRIPTION_PRODUCT_NAME = "Rotta — Mensalidade da Plataforma";

/**
 * Taxas públicas da Asaas (asaas.com/taxas, consultado em 2026-08 —
 * Dossiê 26, cartão/débito/boleto) — calculado de forma determinística
 * a partir do preço público, nunca dependendo de um campo `fee` da API
 * (contrato não testado com uma chave real). CONFERIR contra o plano
 * contratado antes de produção — a Asaas negocia taxa por volume/conta.
 */
export const ASAAS_FEE_CARD_PERCENT = 0.0349;
export const ASAAS_FEE_CARD_FIXED_CENTS = 49;
export const ASAAS_FEE_BOLETO_CENTS = 199;
/** Cadência única do plano Starter — mesmo valor de `ROTTA_SUBSCRIPTION_PRICE_CENTS`, aqui só pra deixar explícito o `nextDueDate` inicial (hoje). */
export const ASAAS_SUBSCRIPTION_CYCLE = "MONTHLY" as const;

/**
 * Assinar o plano ANTES de ter conta (Dossiê 26, pedido do usuário
 * 31/08/2026: "Assinar o plano e com uma integração criar a conta e daí
 * ele validar"). Prefixo colocado no `externalReference` da Asaas
 * sempre que a correlação é com uma `PendingSubscription` — nunca com
 * uma `Company` de verdade — pra `BillingService` saber, ao processar o
 * webhook, que deve seguir `applyAsaasStatus` -> `markPendingSubscriptionPaid`.
 */
export const PENDING_SUBSCRIPTION_ID_PREFIX = "pending:";

/** 48h, decisão do usuário ("Expira em 48h e reembolsa") — pagamento feito antes do cadastro que ninguém veio reclamar expira e é devolvido automaticamente. */
export const PRE_SIGNUP_EXPIRES_HOURS = 48;

/** Página máxima aceita pela própria API da Asaas (`GET /payments?limit=...`). */
export const ASAAS_PAYMENTS_PAGE_SIZE = 100;
/**
 * Circuit breaker da reconciliação financeira (`BillingService.
 * reconciliarPagamentosAsaas`) — nunca deveria bater nisto tão cedo no
 * produto (volume baixo), mas existe pra nunca deixar o painel Admin
 * preso num loop de paginação infinito se a Asaas devolver `hasMore`
 * incorretamente. Loga um aviso claro se bater no teto, nunca falha
 * silenciosamente.
 */
export const ASAAS_PAYMENTS_MAX_PAGES = 50;
