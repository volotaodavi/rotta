import { Controller, HttpCode, HttpStatus, Post, UseGuards } from "@nestjs/common";
import { ApiExcludeController } from "@nestjs/swagger";

import { DataRetentionService } from "./data-retention.service";

import { Public } from "@/common/decorators/public.decorator";
import { SemRateLimit } from "@/common/decorators/sem-rate-limit.decorator";
import { QstashSignatureGuard } from "@/infra/queue/qstash/qstash-signature.guard";

/**
 * "Worker" da limpeza de retenção — mesmo papel de
 * `DocumentExpiryQueueController`: o QStash invoca este endpoint
 * (agendamento registrado por `DataRetentionSchedulerService`), fora do
 * ciclo de vida de qualquer requisição de usuário.
 */
@ApiExcludeController()
// Callback do QStash — rajada é o comportamento normal de uma fila.
// Ver `sem-rate-limit.decorator.ts`.
@SemRateLimit()
@Controller("internal/queue/data-retention")
@Public()
@UseGuards(QstashSignatureGuard)
export class DataRetentionQueueController {
  constructor(private readonly dataRetentionService: DataRetentionService) {}

  @Post("daily")
  @HttpCode(HttpStatus.OK)
  async daily(): Promise<{ ok: true; apagadas: number; aindaSobrou: boolean }> {
    const { apagadas, aindaSobrou } = await this.dataRetentionService.limparPosicoesAntigas();
    return { ok: true, apagadas, aindaSobrou };
  }
}
