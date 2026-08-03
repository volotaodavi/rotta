import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";

import { InepSyncService } from "../agents/inep-sync.service";
import { INEP_SYNC_QUEUE } from "../geo.constants";

import type { Job } from "bullmq";

export interface InepSyncJobData {
  ano: number;
}

/**
 * Worker da fila `inep-sync` — tira o download+parse+diff do Censo
 * Escolar (potencialmente demorado, ~200 mil linhas) de dentro da
 * requisição HTTP: `POST /geo/inep-sync` só enfileira e responde
 * `202 Accepted` imediatamente; o resultado (`InepSyncResumo`) fica só
 * nos logs — consultar o progresso fica para quando uma tela de
 * acompanhamento for construída (hoje é "dispara e confia no log").
 */
@Processor(INEP_SYNC_QUEUE, { concurrency: 1 })
export class InepSyncProcessor extends WorkerHost {
  private readonly logger = new Logger(InepSyncProcessor.name);

  constructor(private readonly inepSync: InepSyncService) {
    super();
  }

  async process(job: Job<InepSyncJobData>): Promise<void> {
    this.logger.log(`Iniciando sincronização INEP ${job.data.ano} (job ${job.id}).`);
    await this.inepSync.sincronizar(job.data.ano);
  }
}
