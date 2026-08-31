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

/**
 * Taxas públicas da Asaas (asaas.com/taxas, consultado em 2026-08 —
 * Dossiê 26, cartão/débito/boleto) — mesmo raciocínio de
 * `ABACATEPAY_FEE_PIX_CENTS` acima: calculado de forma determinística
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
 * Renovação automática do Pix avulso (Dossiê 26 — "Pix recorrente"): a
 * AbacatePay não tem assinatura recorrente de Pix de verdade (só cobrança
 * avulsa), então a Rotta simula a recorrência reemitindo um novo Pix
 * automaticamente a cada ciclo (`BillingService.processarVencimentosPix`,
 * job diário via QStash — mesmo mecanismo do `InepSyncSchedulerService`).
 */
export const PIX_RECURRENCE_MONTHS = 1;
/** Reemite um novo Pix a partir de N dias antes do vencimento — tempo generoso pra pagar sem atrasar. */
export const PIX_REISSUE_WINDOW_DAYS = 5;
/** Não reemite de novo antes de passar esse tanto de dias do último aviso — evita spam de QR Code novo todo dia enquanto a empresa não paga. */
export const PIX_REISSUE_REPEAT_DAYS = 3;
/** Mesma folga de `TRIAL_GRACE_DAYS` (Companies) — 1 dia de graça após o vencimento antes de marcar `INADIMPLENTE`. */
export const PIX_OVERDUE_GRACE_DAYS = 1;

/**
 * Assinar o plano ANTES de ter conta (Dossiê 26, pedido do usuário
 * 31/08/2026: "Assinar o plano e com uma integração criar a conta e daí
 * ele validar"). Prefixo colocado no `metadata.externalId`
 * (AbacatePay)/`externalReference` (Asaas) sempre que a correlação é
 * com uma `PendingSubscription` — nunca com uma `Company` de verdade —
 * pra `BillingService` saber, ao processar o webhook, qual dos dois
 * caminhos seguir (`applyPixPayment`/`applyAsaasStatus`).
 */
export const PENDING_SUBSCRIPTION_ID_PREFIX = "pending:";

/** 48h, decisão do usuário ("Expira em 48h e reembolsa") — pagamento feito antes do cadastro que ninguém veio reclamar expira e é devolvido automaticamente. */
export const PRE_SIGNUP_EXPIRES_HOURS = 48;
