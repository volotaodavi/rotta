/**
 * Tipos do contrato da API v3 da Asaas (Dossiê 26) — levantados a partir
 * do conhecimento geral público da API (docs.asaas.com), SEM nenhuma
 * chamada real testada ainda (não há `ASAAS_API_KEY` neste ambiente de
 * desenvolvimento). Mesma ressalva de `RottaPayProviderService`
 * (Lytex) — NÃO tem o mesmo grau de confiança que `abacatepay.types.ts`
 * (contrato confirmado com chamadas reais). `IntegrationHealthService`
 * vai registrar qualquer divergência assim que a primeira chamada real
 * acontecer em produção.
 *
 * Duas diferenças estruturais da AbacatePay que valem destacar:
 * - Resposta é um JSON "flat" (o próprio objeto, sem envelope
 *   `{success, data}`) — erro vem como `{errors: [{code, description}]}`.
 * - Autenticação é o header custom `access_token` (não `Authorization:
 *   Bearer`).
 */

/** Formato de erro da Asaas quando a requisição falha (qualquer HTTP != 2xx). */
export interface AsaasErrorEnvelope {
  errors: Array<{ code: string; description: string }>;
}

export interface AsaasCustomer {
  id: string;
  name: string;
  cpfCnpj: string;
  email?: string;
  externalReference?: string;
}

export interface CreateAsaasCustomerInput {
  name: string;
  cpfCnpj: string;
  email?: string;
  /** `company.id` — mesmo papel do `externalId` na AbacatePay: correlação de volta no webhook, sem outra consulta. */
  externalReference: string;
}

/**
 * `billingType` — a Asaas aceita cobrar cartão SEM tokenização prévia
 * (campos `creditCard`/`creditCardHolderInfo` direto no `POST
 * /payments` ou `/subscriptions`), diferente da AbacatePay (que exige
 * um checkout hospedado pra cartão). É essa diferença que viabiliza o
 * checkout próprio da Rotta pedido pelo usuário ("página própria para
 * receber os pagamentos").
 */
export type AsaasBillingType = "CREDIT_CARD" | "DEBIT_CARD" | "BOLETO";

export interface AsaasCreditCardInput {
  holderName: string;
  number: string;
  expiryMonth: string;
  expiryYear: string;
  ccv: string;
}

export interface AsaasCreditCardHolderInfoInput {
  name: string;
  email: string;
  cpfCnpj: string;
  postalCode: string;
  addressNumber: string;
  phone?: string;
}

export interface CreateAsaasSubscriptionInput {
  customer: string;
  billingType: AsaasBillingType;
  value: number;
  /** `"MONTHLY"` — mesmo ciclo de cobrança da AbacatePay, sem alternativa por ora (plano único Starter). */
  cycle: "MONTHLY";
  nextDueDate: string;
  description?: string;
  externalReference?: string;
  creditCard?: AsaasCreditCardInput;
  creditCardHolderInfo?: AsaasCreditCardHolderInfoInput;
}

export interface AsaasSubscription {
  id: string;
  customer: string;
  status: "ACTIVE" | "EXPIRED" | "INACTIVE";
  billingType: AsaasBillingType;
  value: number;
  nextDueDate: string;
}

export interface AsaasPayment {
  id: string;
  customer: string;
  subscription?: string;
  /** Ecoado de volta do `externalReference: company.id` passado em `createSubscription` — mesma chave de correlação usada pelo webhook (`applyAsaasStatus`). */
  externalReference?: string;
  status:
    | "PENDING"
    | "RECEIVED"
    | "CONFIRMED"
    | "OVERDUE"
    | "REFUNDED"
    | "RECEIVED_IN_CASH"
    | "CHARGEBACK_REQUESTED";
  billingType: AsaasBillingType;
  value: number;
  /** Boleto: linha digitável, pra exibir sem precisar abrir o PDF. */
  identificationField?: string;
  /** Boleto: link do PDF hospedado pela própria Asaas. */
  bankSlipUrl?: string;
  invoiceUrl?: string;
}

/**
 * Envelope de webhook da Asaas (`docs.asaas.com/docs/webhook`) —
 * eventos de assinatura/pagamento chegam com o mesmo formato
 * `{event, payment}` (assinatura não manda um objeto próprio de evento,
 * o `payment.subscription` é o vínculo de volta pra ela).
 */
export interface AsaasWebhookEnvelope {
  event: string;
  payment?: AsaasPayment;
}
