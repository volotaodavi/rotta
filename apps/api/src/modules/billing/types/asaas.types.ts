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
 *
 * `"PIX"` (pedido do usuário 02/09/2026: "pode deixar o pix pelo Asaas
 * também" — a AbacatePay ficou com a chave inválida/desatualizada em
 * produção, "API key version mismatch") — usado só como FALLBACK
 * automático em `BillingService.createPreSignupPixCheckout` quando a
 * AbacatePay não está configurada, nunca oferecido como opção separada
 * na tela (o usuário final continua vendo um único botão "Pix").
 * Escopo desta entrega: só o pré-cadastro (`/planos/assinar`, sem conta
 * ainda) — o Pix autenticado (`createPixCheckoutForCompany`, cobrança
 * avulsa reemitida por `processarVencimentosPix`) continua exclusivo da
 * AbacatePay por enquanto: é um mecanismo de "assinatura simulada"
 * estruturalmente diferente da assinatura recorrente nativa da Asaas,
 * que merece seu próprio fallback dedicado, não um patch apressado.
 */
export type AsaasBillingType = "CREDIT_CARD" | "DEBIT_CARD" | "BOLETO" | "PIX";

/**
 * `GET /payments/{id}/pixQrCode` — só existe pra um `payment`/primeira
 * cobrança de uma `subscription` criada com `billingType: "PIX"`.
 * `payload` é o código copia-e-cola; `encodedImage` é o QR em base64
 * puro (sem prefixo `data:image/png;base64,`, diferente da AbacatePay
 * — ver `BillingService.toPixCheckoutFromAsaas`, que normaliza os dois
 * formatos pro mesmo contrato que o front já consome).
 */
export interface AsaasPixQrCode {
  success: boolean;
  encodedImage: string;
  payload: string;
  expirationDate: string;
}

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

/**
 * `POST /payments` — cobrança AVULSA, sem assinatura (diferente de
 * `CreateAsaasSubscriptionInput`, sempre recorrente). Usado pelo Admin
 * pra gerar um QR Pix pra receber um valor qualquer, não vinculado à
 * mensalidade de nenhuma empresa (pedido do usuário 03/09/2026:
 * "posso também pedir o recebimento de transferências... incluindo o
 * QR Code pix?").
 */
export interface CreateAsaasPaymentInput {
  customer: string;
  billingType: AsaasBillingType;
  value: number;
  dueDate: string;
  description?: string;
  externalReference?: string;
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
  /** Quando a cobrança foi criada — sempre presente. */
  dateCreated?: string;
  /** Quando o pagamento foi de fato confirmado — só presente após `status` virar pago; usado pra filtrar "a partir de hoje" (pedido do usuário 03/09/2026). */
  paymentDate?: string | null;
  /**
   * Valor líquido já com a taxa da Asaas descontada — vem pronto da
   * própria API (confirmado com uma chamada real de produção, pedido do
   * usuário 02/09/2026: "veja a parte de faturamento... provedor
   * Asaas"), diferente da AbacatePay (`ABACATEPAY_FEE_*`, formula
   * estimada porque o `billing/list` deles não devolve valor líquido).
   * `value - netValue` = taxa retida, sem precisar estimar nada.
   */
  netValue?: number;
  /** Boleto: linha digitável, pra exibir sem precisar abrir o PDF. */
  identificationField?: string;
  /** Boleto: link do PDF hospedado pela própria Asaas. */
  bankSlipUrl?: string;
  invoiceUrl?: string;
}

/** Envelope de lista paginada da Asaas (`GET /payments` etc.) — `hasMore` indica se há mais páginas além de `offset + data.length`. */
export interface AsaasListEnvelope<T> {
  object: "list";
  hasMore: boolean;
  totalCount: number;
  limit: number;
  offset: number;
  data: T[];
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

/**
 * `GET /finance/balance` — saldo atual da conta Asaas da Rotta (dinheiro
 * já recebido, disponível para transferência). Pedido do usuário
 * 03/09/2026: "área financeira... saldo atual". Valor em REAIS (não
 * centavos) — igual a todo o resto deste arquivo, `BillingService`
 * converte pra centavos na borda antes de expor pro front.
 */
export interface AsaasBalance {
  balance: number;
}

/**
 * `GET /financialTransactions` — o extrato de verdade da conta (toda
 * entrada/saída: cobrança recebida, taxa da Asaas, transferência feita,
 * estorno...). `value` positivo = entrada, negativo = saída — mesma
 * convenção da própria Asaas, `BillingService` não inverte sinal
 * nenhum. `balance` é o saldo IMEDIATAMENTE APÓS esta transação (extrato
 * bancário tradicional).
 */
export interface AsaasFinancialTransaction {
  id?: string;
  date: string;
  value: number;
  balance: number;
  /** Tipo bruto da Asaas (`PAYMENT_RECEIVED`, `TRANSFER`, `ASAAS_FEE`...) — nunca um enum fechado nosso, a Asaas adiciona tipos novos sem aviso. */
  type: string;
  description?: string;
}

/**
 * `POST /transfers` (`docs.asaas.com/reference/criar-transferencia`) —
 * saída de dinheiro da conta Asaas da Rotta. Só Pix por chave nesta
 * entrega (pedido do usuário: "fazer transferências") — TED/conta
 * bancária tradicional fica pra uma entrega futura se for pedido.
 * `value` em REAIS.
 */
export interface CreateAsaasTransferInput {
  value: number;
  pixAddressKey: string;
  pixAddressKeyType: "CPF" | "CNPJ" | "EMAIL" | "PHONE" | "EVP";
  operationType: "PIX";
  description?: string;
}

/**
 * "A criação da transferência não significa que ela já foi concluída"
 * (docs.asaas.com) — `status` começa `PENDING`/`BANK_PROCESSING` e só
 * um webhook (ou nova consulta) confirma `DONE`. `BillingService` nunca
 * assume sucesso só por ter recebido 2xx daqui.
 */
export interface AsaasTransfer {
  id: string;
  value: number;
  netValue?: number;
  transferFee?: number;
  status: "PENDING" | "BANK_PROCESSING" | "DONE" | "CANCELLED" | "FAILED";
  failReason?: string | null;
  dateCreated?: string;
  effectiveDate?: string | null;
}
