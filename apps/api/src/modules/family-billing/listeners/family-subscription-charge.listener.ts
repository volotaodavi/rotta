import { Injectable } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";

import { FAMILY_SUBSCRIPTION_CHARGE_EVENT } from "../events/family-subscription-charge.event";
import { FamilyBillingService } from "../family-billing.service";

import type { FamilySubscriptionChargeEvent } from "../events/family-subscription-charge.event";

/**
 * Liga a cobrança que a recorrência gerou à fatura do mês.
 *
 * É o que faz a família ter um link para pagar: a cobrança nasce no
 * Asaas sozinha, e sem esta ligação ela existiria lá sem aparecer em
 * lugar nenhum da Rotta — nem para a família, nem para a transportadora.
 */
@Injectable()
export class FamilySubscriptionChargeListener {
  constructor(private readonly familyBillingService: FamilyBillingService) {}

  @OnEvent(FAMILY_SUBSCRIPTION_CHARGE_EVENT)
  async handle(event: FamilySubscriptionChargeEvent): Promise<void> {
    await this.familyBillingService.vincularCobrancaDaAssinatura(event);
  }
}
