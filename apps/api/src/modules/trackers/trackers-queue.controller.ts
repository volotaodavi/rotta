import { Controller, HttpCode, HttpStatus, Post, UseGuards } from "@nestjs/common";
import { ApiExcludeController } from "@nestjs/swagger";

import { TrackersService } from "./trackers.service";

import { Public } from "@/common/decorators/public.decorator";
import { SemRateLimit } from "@/common/decorators/sem-rate-limit.decorator";
import { QstashSignatureGuard } from "@/infra/queue/qstash/qstash-signature.guard";

/**
 * "Worker" da varredura de viagens sem sinal, mesmo papel de
 * `DataRetentionQueueController`: o QStash invoca este endpoint pelo
 * agendamento que `TrackersSchedulerService` registra, fora do ciclo de
 * vida de qualquer requisição de usuário.
 */
@ApiExcludeController()
// Callback do QStash: rajada é o comportamento normal de uma fila.
@SemRateLimit()
@Controller("internal/queue/trackers")
@Public()
@UseGuards(QstashSignatureGuard)
export class TrackersQueueController {
  constructor(private readonly trackersService: TrackersService) {}

  @Post("viagens-sem-sinal")
  @HttpCode(HttpStatus.OK)
  async viagensSemSinal(): Promise<{
    ok: true;
    avaliadas: number;
    encerradas: number;
    falhas: number;
  }> {
    const resultado = await this.trackersService.encerrarViagensSemSinal();
    return { ok: true, ...resultado };
  }
}
