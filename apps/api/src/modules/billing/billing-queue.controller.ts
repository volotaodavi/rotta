import { Controller, HttpCode, HttpStatus, Post, UseGuards } from "@nestjs/common";
import { ApiExcludeController } from "@nestjs/swagger";

import { BillingService } from "./billing.service";
import { CobrancaService, type ResultadoDaCobranca } from "./cobranca.service";

import { Public } from "@/common/decorators/public.decorator";
import { SemRateLimit } from "@/common/decorators/sem-rate-limit.decorator";
import { QstashSignatureGuard } from "@/infra/queue/qstash/qstash-signature.guard";

/**
 * "Worker" do job assíncrono de Billing (Dossiê 26) — mesmo papel de
 * `GeoQueueController`: o QStash invoca este endpoint (agendamento
 * registrado por `BillingSchedulerService`), fora do ciclo de vida de
 * uma requisição HTTP de usuário. `@Public()` + `QstashSignatureGuard`
 * — única defesa real deste endpoint (ver o Guard para o porquê).
 */
@ApiExcludeController()
// Callback do QStash — rajada é o comportamento normal de uma fila.
// Ver `sem-rate-limit.decorator.ts`.
@SemRateLimit()
@Controller("internal/queue/billing")
@Public()
@UseGuards(QstashSignatureGuard)
export class BillingQueueController {
  constructor(
    private readonly billingService: BillingService,
    private readonly cobrancaService: CobrancaService,
  ) {}

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

  /**
   * A régua de cobrança, uma vez por dia.
   *
   * Ligada no agendamento em 06/10/2026, com autorização do fundador e
   * depois de a lista ter sido conferida ao vivo (estava vazia: uma
   * transportadora pagante, nenhuma inadimplente). Deixar um robô
   * mandando cobrança sem que a lista tivesse sido olhada uma primeira
   * vez seria arriscar o primeiro contato da Rotta com um cliente.
   *
   * O serviço já se protege sozinho: empresa avisada há menos de três
   * dias é pulada, e o carimbo só é gravado depois do envio aceito.
   */
  @Post("cobrar-pendencias")
  @HttpCode(HttpStatus.OK)
  async cobrarPendencias(): Promise<{ ok: true } & ResultadoDaCobranca> {
    const resultado = await this.cobrancaService.cobrarPendencias();
    return { ok: true, ...resultado };
  }
}
