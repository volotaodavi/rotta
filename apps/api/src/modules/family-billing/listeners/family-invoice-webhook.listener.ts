import { Injectable, Logger } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";

import { FAMILY_INVOICE_WEBHOOK_EVENT } from "../events/family-invoice-paid.event";
import { FamilyBillingService } from "../family-billing.service";

import type { FamilyInvoiceWebhookEvent } from "../events/family-invoice-paid.event";

/** Centavos a partir de reais da Asaas — arredondado, nunca truncado (R$ 66,60 é 6660, não 6659). */
function paraCentavos(reais: number): number {
  return Math.round(reais * 100);
}

/**
 * Aplica à fatura da família o que o webhook da Asaas disse.
 *
 * Trata só os eventos que mudam o dinheiro. Qualquer outro é ignorado de
 * propósito, com log de depuração — a Asaas adiciona eventos novos sem
 * aviso, e reagir a um evento desconhecido é pior do que não reagir.
 */
@Injectable()
export class FamilyInvoiceWebhookListener {
  private readonly logger = new Logger(FamilyInvoiceWebhookListener.name);

  constructor(private readonly familyBillingService: FamilyBillingService) {}

  @OnEvent(FAMILY_INVOICE_WEBHOOK_EVENT)
  async handle(event: FamilyInvoiceWebhookEvent): Promise<void> {
    switch (event.asaasEvent) {
      case "PAYMENT_CONFIRMED":
      case "PAYMENT_RECEIVED": {
        const valorPagoCentavos = paraCentavos(event.valorReais);
        const liquidoCentavos =
          event.valorLiquidoReais !== undefined && event.valorLiquidoReais !== null
            ? paraCentavos(event.valorLiquidoReais)
            : null;
        await this.familyBillingService.confirmarPagamento({
          asaasPaymentId: event.asaasPaymentId,
          valorPagoCentavos,
          /* A taxa é derivada do líquido que a própria Asaas informa —
             nunca estimada por percentual nosso. Sem `netValue`, fica
             `null`: desconhecida é melhor que inventada. */
          taxaDoProvedorCentavos:
            liquidoCentavos !== null ? valorPagoCentavos - liquidoCentavos : null,
          pagoEm: event.pagoEm ? new Date(event.pagoEm) : new Date(),
        });
        return;
      }
      case "PAYMENT_REFUNDED":
      case "PAYMENT_CHARGEBACK_REQUESTED":
        await this.familyBillingService.registrarEstorno(event.asaasPaymentId);
        return;
      default:
        this.logger.debug(
          `Evento Asaas de fatura da familia nao tratado (ignorado de proposito): ${event.asaasEvent}`,
        );
    }
  }
}
