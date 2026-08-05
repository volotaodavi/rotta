import { Body, Controller, HttpCode, HttpStatus, Logger, Post, UseGuards } from "@nestjs/common";
import { ApiExcludeController } from "@nestjs/swagger";

import { InepSyncService } from "./agents/inep-sync.service";
import { GeoPipelineService } from "./geo-pipeline.service";

import type { InepSyncJobData, SchoolGeocodeJobData } from "./geo-queue.types";

import { Public } from "@/common/decorators/public.decorator";
import { QstashSignatureGuard } from "@/infra/queue/qstash/qstash-signature.guard";

/**
 * "Worker" dos jobs assíncronos do Rotta Geo Platform (Dossiê 14) —
 * substitui `SchoolGeocodeProcessor`/`InepSyncProcessor` (BullMQ) por
 * endpoints HTTP que o QStash invoca: cada `POST` aqui é uma entrega de
 * job publicado por `InepSyncService.enfileirarGeocodificacao`,
 * `GeoController.sincronizarInep` ou `InepSyncSchedulerService`.
 *
 * `@Public()` + `QstashSignatureGuard` — mesma disciplina de
 * `NotificationDeliveryController` (única defesa real destes
 * endpoints, ver o Guard para o porquê).
 */
@ApiExcludeController()
@Controller("internal/queue/geo")
@Public()
@UseGuards(QstashSignatureGuard)
export class GeoQueueController {
  private readonly logger = new Logger(GeoQueueController.name);

  constructor(
    private readonly geoPipeline: GeoPipelineService,
    private readonly inepSync: InepSyncService,
  ) {}

  /**
   * Um job por escola nova/alterada. `NotFoundException` (escola
   * apagada entre o enfileiramento e a entrega) responde 200 — nenhum
   * retry resolveria sozinho, equivalente ao `UnrecoverableError` que o
   * antigo `SchoolGeocodeProcessor` lançava. Qualquer outro erro
   * propaga (NestJS responde 5xx) para o QStash tentar de novo
   * (`retries`/`flowControl` configurados em
   * `InepSyncService.enfileirarGeocodificacao`).
   */
  @Post("school-geocode")
  @HttpCode(HttpStatus.OK)
  async schoolGeocode(@Body() data: SchoolGeocodeJobData): Promise<{ ok: true }> {
    try {
      await this.geoPipeline.geocodeSchool(data.schoolId);
    } catch (error) {
      if (error instanceof Error && error.name === "NotFoundException") {
        this.logger.warn(
          `Geocodificação da escola ${data.schoolId} não resolvida: ${error.message}`,
        );
        return { ok: true };
      }
      throw error;
    }
    return { ok: true };
  }

  /**
   * Um job por rodada de sincronização (`{ ano }`), disparado
   * manualmente (`POST /geo/inep-sync`) ou automaticamente
   * (`InepSyncSchedulerService`, quando `INEP_SYNC_CRON` configurado).
   * Tira o download+parse+diff do Censo Escolar (potencialmente
   * demorado) de dentro da requisição HTTP original.
   */
  @Post("inep-sync")
  @HttpCode(HttpStatus.OK)
  async inepSyncJob(@Body() data: InepSyncJobData): Promise<{ ok: true }> {
    this.logger.log(`Iniciando sincronização INEP ${data.ano}.`);
    await this.inepSync.sincronizar(data.ano);
    return { ok: true };
  }
}
