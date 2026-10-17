/**
 * O webhook da Asaas trouxe um evento de uma cobrança de mensalidade da
 * família (reconhecida pelo prefixo `fatura:` em `externalReference`).
 *
 * ## Por que um evento, e não uma chamada direta
 *
 * Porque `BillingModule` já é importado por `FamilyBillingModule` (para
 * usar o `AsaasClientService`), e uma chamada de volta fecharia o ciclo
 * entre os dois módulos. O barramento de eventos que o projeto já usa
 * (`COMMUNICATION_REQUESTED_EVENT`, `SCHOOL_CREATED_EVENT`) resolve isso
 * sem `forwardRef`.
 *
 * O webhook usa `emitAsync` e espera o listener: processamento de
 * dinheiro não pode responder 200 para a Asaas antes de ter gravado
 * nada.
 */
export const FAMILY_INVOICE_WEBHOOK_EVENT = "family-billing.invoice.webhook";

export interface FamilyInvoiceWebhookEvent {
  /** Nome cru do evento da Asaas (`PAYMENT_CONFIRMED`, `PAYMENT_REFUNDED`...). */
  asaasEvent: string;
  asaasPaymentId: string;
  /** Valor em REAIS, como a Asaas manda — o listener converte. */
  valorReais: number;
  /** Líquido já com a taxa do provedor descontada, quando a Asaas informa. */
  valorLiquidoReais?: number | null;
  /** `AsaasPayment.paymentDate`, quando presente. */
  pagoEm?: string | null;
}
