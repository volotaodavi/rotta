import { Controller, HttpCode, HttpStatus, Post, UseGuards } from "@nestjs/common";
import { ApiExcludeController } from "@nestjs/swagger";

import { AdminDigestService } from "./admin-digest.service";

import { Public } from "@/common/decorators/public.decorator";
import { QstashSignatureGuard } from "@/infra/queue/qstash/qstash-signature.guard";

/**
 * "Worker" dos jobs assíncronos do resumo do Admin Rotta — mesmo papel
 * de `BillingQueueController`: o QStash invoca estes endpoints
 * (agendamento registrado por `AdminDigestSchedulerService`), fora do
 * ciclo de vida de uma requisição HTTP de usuário. `@Public()` +
 * `QstashSignatureGuard` — única defesa real destes endpoints.
 */
@ApiExcludeController()
@Controller("internal/queue/admin-digest")
@Public()
@UseGuards(QstashSignatureGuard)
export class AdminDigestQueueController {
  constructor(private readonly adminDigestService: AdminDigestService) {}

  @Post("weekly")
  @HttpCode(HttpStatus.OK)
  async weekly(): Promise<{ ok: true }> {
    const periodo = this.adminDigestService.periodoUltimaSemana();
    await this.adminDigestService.enviarResumo("RELATORIO_SEMANAL", periodo);
    return { ok: true };
  }

  @Post("monthly")
  @HttpCode(HttpStatus.OK)
  async monthly(): Promise<{ ok: true }> {
    const periodo = this.adminDigestService.periodoUltimoMes();
    await this.adminDigestService.enviarResumo("RELATORIO_MENSAL", periodo);
    return { ok: true };
  }
}
