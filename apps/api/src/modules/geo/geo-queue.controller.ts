import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Inject,
  Logger,
  Post,
  UseGuards,
} from "@nestjs/common";
import { ApiExcludeController } from "@nestjs/swagger";

import { InepSyncService } from "./agents/inep-sync.service";
import { GeoPipelineService } from "./geo-pipeline.service";
import { SCHOOL_COORDINATE_REPOSITORY, SCHOOL_GEOCODE_QUEUE } from "./geo.constants";

import type { InepSyncJobData, SchoolGeocodeJobData } from "./geo-queue.types";
import type { SchoolCoordinateRepository } from "./repositories/school-coordinate.repository";

import { Public } from "@/common/decorators/public.decorator";
import { QstashPublisherService } from "@/infra/queue/qstash/qstash-publisher.service";
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
    @Inject(SCHOOL_COORDINATE_REPOSITORY)
    private readonly coordinateRepository: SchoolCoordinateRepository,
    private readonly qstashPublisher: QstashPublisherService,
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
    if (data.permitirAnoAnterior) {
      await this.inepSync.sincronizarComFallbackDeAno(data.ano);
    } else {
      await this.inepSync.sincronizar(data.ano);
    }
    return { ok: true };
  }

  /**
   * Job sem payload, publicado por `GeoController.reprocessarFilaRevisaoManual`
   * — quem de fato enumera a Fila de Revisão Manual atual e publica um
   * `SCHOOL_GEOCODE_QUEUE` por escola pendente, reaproveitando o mesmo
   * flowControl que `InepSyncService.enfileirarGeocodificacao` já usa
   * pra respeitar a política pública do Nominatim (~1 req/seg). Tira
   * esse trabalho (que pode envolver milhares de escolas) de dentro da
   * requisição HTTP original — achado real testando contra produção:
   * a 1ª versão fazia tudo isso síncrono no `POST /geo/revisao-manual/
   * reprocessar` e estourava 408 Request Timeout.
   */
  @Post("revisao-manual-reprocess")
  @HttpCode(HttpStatus.OK)
  async revisaoManualReprocessJob(): Promise<{ ok: true; enfileiradas: number }> {
    const pendentes = await this.coordinateRepository.listByStatus("REVISAO_MANUAL");
    const schoolIds = [...new Set(pendentes.map((coordenada) => coordenada.schoolId))];

    if (schoolIds.length > 0) {
      await this.qstashPublisher.publishBatchJSON(
        schoolIds.map((schoolId) => ({
          route: `geo/${SCHOOL_GEOCODE_QUEUE}`,
          body: { schoolId },
          options: {
            retries: 3,
            flowControlKey: SCHOOL_GEOCODE_QUEUE,
            flowControlParallelism: 1,
            flowControlRate: 1,
            flowControlPeriod: "1.1s",
          },
        })),
      );
    }

    this.logger.log(
      `Reprocessamento da Fila de Revisão Manual: ${schoolIds.length} escola(s) reenfileirada(s) para geocodificação.`,
    );
    return { ok: true, enfileiradas: schoolIds.length };
  }
}
