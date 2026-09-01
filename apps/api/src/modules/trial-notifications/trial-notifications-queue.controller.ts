import { Controller, HttpCode, HttpStatus, Post, UseGuards } from "@nestjs/common";
import { ApiExcludeController } from "@nestjs/swagger";

import { TrialNotificationsService } from "./trial-notifications.service";

import { Public } from "@/common/decorators/public.decorator";
import { QstashSignatureGuard } from "@/infra/queue/qstash/qstash-signature.guard";

/**
 * "Worker" do job diário de aviso de trial — mesmo papel de
 * `AdminDigestQueueController`: o QStash invoca este endpoint
 * (agendamento registrado por `TrialNotificationsSchedulerService`),
 * fora do ciclo de vida de uma requisição HTTP de usuário.
 */
@ApiExcludeController()
@Controller("internal/queue/trial-notifications")
@Public()
@UseGuards(QstashSignatureGuard)
export class TrialNotificationsQueueController {
  constructor(private readonly trialNotificationsService: TrialNotificationsService) {}

  @Post("daily")
  @HttpCode(HttpStatus.OK)
  async daily(): Promise<{ ok: true; notificadas: number }> {
    const { notificadas } = await this.trialNotificationsService.avaliarTodasAsEmpresas();
    return { ok: true, notificadas };
  }
}
