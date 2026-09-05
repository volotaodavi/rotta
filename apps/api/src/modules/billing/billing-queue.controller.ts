import { Controller, HttpCode, HttpStatus, Post, UseGuards } from "@nestjs/common";
import { ApiExcludeController } from "@nestjs/swagger";

import { BillingService } from "./billing.service";

import { Public } from "@/common/decorators/public.decorator";
import { QstashSignatureGuard } from "@/infra/queue/qstash/qstash-signature.guard";

/**
 * "Worker" do job assíncrono de Billing (Dossiê 26) — mesmo papel de
 * `GeoQueueController`: o QStash invoca este endpoint (agendamento
 * registrado por `BillingSchedulerService`), fora do ciclo de vida de
 * uma requisição HTTP de usuário. `@Public()` + `QstashSignatureGuard`
 * — única defesa real deste endpoint (ver o Guard para o porquê).
 */
@ApiExcludeController()
@Controller("internal/queue/billing")
@Public()
@UseGuards(QstashSignatureGuard)
export class BillingQueueController {
  constructor(private readonly billingService: BillingService) {}

  /** Sem payload — reembolsa/expira `PendingSubscription` pagas há mais de 48h sem cadastro vinculado (`processarPendingSubscriptionsExpiradas`). */
  @Post("expire-pending-subscriptions")
  @HttpCode(HttpStatus.OK)
  async expirePendingSubscriptions(): Promise<{
    ok: true;
    reembolsados: number;
    expirados: number;
  }> {
    const resultado = await this.billingService.processarPendingSubscriptionsExpiradas();
    return { ok: true, ...resultado };
  }
}
