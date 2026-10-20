import { Injectable } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";

import { ASAAS_ACCOUNT_STATUS_EVENT } from "../events/asaas-account-status.event";
import { FamilyBillingService } from "../family-billing.service";

import type { AsaasAccountStatusEvent } from "../events/asaas-account-status.event";

/**
 * Leva ao estado da conta de recebimento o que o Asaas disse sobre a
 * subconta.
 *
 * É o que tira a espera de cima de alguém: sem isto, uma subconta
 * aprovada continuaria aparecendo como "em análise" até alguém abrir o
 * painel do Asaas para conferir.
 */
@Injectable()
export class AsaasAccountStatusListener {
  constructor(private readonly familyBillingService: FamilyBillingService) {}

  @OnEvent(ASAAS_ACCOUNT_STATUS_EVENT)
  async handle(event: AsaasAccountStatusEvent): Promise<void> {
    await this.familyBillingService.aplicarSituacaoDaSubconta({
      asaasAccountId: event.asaasAccountId,
      situacaoGeral: event.situacaoGeral,
      eventoDaAsaas: event.asaasEvent,
    });
  }
}
