/**
 * A recorrência da família gerou uma cobrança no Asaas
 * (`PAYMENT_CREATED` num pagamento cujo `externalReference` tem o
 * prefixo `contrato:`).
 *
 * ## Por que este evento existe separado do de pagamento
 *
 * Porque ele não é sobre dinheiro que entrou: é sobre uma cobrança que
 * **passou a existir**. A recorrência cria a cobrança de cada mês
 * sozinha, por padrão **40 dias antes do vencimento**, e até alguém
 * ligar essa cobrança à fatura do mês a família não tem link para pagar
 * e a transportadora não vê a cobrança na tela.
 *
 * ## O mês vem do vencimento, nunca da referência
 *
 * Toda cobrança gerada herda o `externalReference` da assinatura, que
 * aponta para o CONTRATO. Se o mês fosse lido de lá, as cobranças de
 * todos os meses chegariam dizendo que são do mesmo mês. Quem identifica
 * a competência é `dueDate`.
 *
 * Mesmo motivo de `FAMILY_INVOICE_WEBHOOK_EVENT` para ser evento e não
 * chamada direta: `FamilyBillingModule` já importa `BillingModule`.
 */
export const FAMILY_SUBSCRIPTION_CHARGE_EVENT = "family-billing.subscription.charge";

export interface FamilySubscriptionChargeEvent {
  /** Nome cru do evento da Asaas. */
  asaasEvent: string;
  /** `sub_...` — a recorrência que gerou esta cobrança. */
  asaasSubscriptionId: string;
  asaasPaymentId: string;
  /** `contract.id`, já sem o prefixo. */
  contractId: string;
  /** Vencimento `YYYY-MM-DD`: é daqui que sai a competência. */
  vencimento: string;
  /** Valor em REAIS, como a Asaas manda. */
  valorReais: number;
  /** A página da cobrança hospedada pelo Asaas — é o link que a família paga. */
  linkDaFatura?: string | null;
  /** Boleto: linha digitável, para copiar sem abrir o PDF. */
  linhaDigitavel?: string | null;
  /** Como a cobrança foi emitida, para a fatura registrar o meio. */
  meioDePagamento?: string | null;
}
