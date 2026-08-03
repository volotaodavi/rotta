import { OnWorkerEvent, Processor, WorkerHost } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import { type Job, UnrecoverableError } from "bullmq";

import { GeoPipelineService } from "../geo-pipeline.service";
import { SCHOOL_GEOCODE_QUEUE } from "../geo.constants";

export interface SchoolGeocodeJobData {
  schoolId: string;
}

/**
 * Worker da fila `school-geocode` — um job por escola nova/alterada,
 * enfileirado pelo Education Sync Agent (`InepSyncService`) em vez de
 * chamar `GeoPipelineService.geocodeSchool` direto (ponto de escala
 * nacional: ~200 mil escolas não podem geocodificar em série numa
 * única requisição HTTP).
 *
 * `attempts`/`backoff` do BullMQ (configurados em `InepSyncService`,
 * na hora de enfileirar) cobrem falha de INFRAESTRUTURA (rede
 * momentaneamente fora, Postgres reiniciando) — não confundir com as
 * 3 tentativas do Validation AI Agent, que são sobre PRECISÃO da
 * geocodificação (cidade/estado não bateram), já resolvidas dentro de
 * uma única execução de `geocodeSchool`.
 *
 * `NotFoundException` (escola apagada entre o enfileiramento e o
 * processamento) não é um problema de infraestrutura — sinalizado
 * como `UnrecoverableError` para o BullMQ não desperdiçar tentativas
 * de retry numa falha que nunca vai se resolver sozinha.
 */
@Processor(SCHOOL_GEOCODE_QUEUE, { concurrency: 5 })
export class SchoolGeocodeProcessor extends WorkerHost {
  private readonly logger = new Logger(SchoolGeocodeProcessor.name);

  constructor(private readonly geoPipeline: GeoPipelineService) {
    super();
  }

  async process(job: Job<SchoolGeocodeJobData>): Promise<void> {
    try {
      await this.geoPipeline.geocodeSchool(job.data.schoolId);
    } catch (error) {
      if (error instanceof Error && error.name === "NotFoundException") {
        throw new UnrecoverableError(error.message);
      }
      throw error;
    }
  }

  @OnWorkerEvent("failed")
  onFailed(job: Job<SchoolGeocodeJobData> | undefined, error: Error): void {
    this.logger.warn(
      `Geocodificação da escola ${job?.data.schoolId} falhou (tentativa ${job?.attemptsMade}): ${error.message}`,
    );
  }
}
