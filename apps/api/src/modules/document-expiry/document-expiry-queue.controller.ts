import { Controller, HttpCode, HttpStatus, Post, UseGuards } from "@nestjs/common";
import { ApiExcludeController } from "@nestjs/swagger";

import { DocumentExpiryService } from "./document-expiry.service";

import { Public } from "@/common/decorators/public.decorator";
import { QstashSignatureGuard } from "@/infra/queue/qstash/qstash-signature.guard";

/**
 * "Worker" do job diário de vencimento de documento — mesmo papel de
 * `TrialNotificationsQueueController`/`AdminDigestQueueController`: o
 * QStash invoca este endpoint (agendamento registrado por
 * `DocumentExpirySchedulerService`), fora do ciclo de vida de uma
 * requisição HTTP de usuário.
 */
@ApiExcludeController()
@Controller("internal/queue/document-expiry")
@Public()
@UseGuards(QstashSignatureGuard)
export class DocumentExpiryQueueController {
  constructor(private readonly documentExpiryService: DocumentExpiryService) {}

  @Post("daily")
  @HttpCode(HttpStatus.OK)
  async daily(): Promise<{ ok: true; notificados: number }> {
    const { notificados } = await this.documentExpiryService.avaliarTodosOsDocumentos();
    return { ok: true, notificados };
  }
}
