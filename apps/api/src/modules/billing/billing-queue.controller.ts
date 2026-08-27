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

  /** Sem payload — o job em si decide quais empresas processar (`processarVencimentosPix`). */
  @Post("reissue-pix")
  @HttpCode(HttpStatus.OK)
  async reissuePix(): Promise<{ ok: true; reenviados: number; marcadosInadimplentes: number }> {
    const resultado = await this.billingService.processarVencimentosPix();
    return { ok: true, ...resultado };
  }
}
