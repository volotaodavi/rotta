/** Tokens de injeção do módulo de cobrança da família (Repository Pattern, Dossiê 12 Seção 6.1). */
export const CONTRACT_INVOICE_REPOSITORY = Symbol("CONTRACT_INVOICE_REPOSITORY");
export const COMPANY_PAYMENT_ACCOUNT_REPOSITORY = Symbol("COMPANY_PAYMENT_ACCOUNT_REPOSITORY");

/**
 * Prefixo de `externalReference` nas cobranças de mensalidade da
 * família na Asaas.
 *
 * Existe pelo mesmo motivo de `pending:` em `billing.constants.ts`: a
 * Asaas devolve esse campo no webhook, e é por ele que se sabe de que
 * fluxo o pagamento é. Sem o prefixo, um pagamento de fatura da família
 * chegaria indistinguível de um pagamento de assinatura da plataforma,
 * e o webhook tentaria ativar uma transportadora com o id de uma
 * fatura.
 */
export const FAMILY_INVOICE_ID_PREFIX = "fatura:";

/**
 * Dia do mês em que a mensalidade vence, quando o contrato não diz
 * outro.
 *
 * Dia 5 não é sorteado: é o padrão do transporte escolar no Brasil (a
 * família recebe no fim do mês e paga nos primeiros dias do seguinte),
 * e é o dia que aparece no conceito visual da tela de Pagamentos
 * ("05/04/2026"). O dia do contrato entra aqui no dia em que o contrato
 * passar a ter esse campo; até lá, um padrão explícito é melhor do que
 * um número espalhado pelo código.
 */
export const DIA_DE_VENCIMENTO_PADRAO = 5;
