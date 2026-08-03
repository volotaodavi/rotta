import { InjectQueue } from "@nestjs/bullmq";
import { Injectable, Logger, type OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import { INEP_SYNC_QUEUE } from "../geo.constants";

import type { InepSyncJobData } from "../processors/inep-sync.processor";
import type { GeoConfig } from "@/config/geo.config";
import type { Queue } from "bullmq";

const JOB_SCHEDULER_ID = "inep-sync-nacional";

/**
 * Automatiza o Education Sync Agent (briefing "quero tudo automatizado")
 * registrando um job repetível do BullMQ (`Queue.upsertJobScheduler`) em
 * vez de um `@Cron` do `@nestjs/schedule`: o agendamento fica coordenado
 * pelo Redis, então múltiplas réplicas do `apps/api` numa implantação em
 * escala nacional nunca disparam a mesma sincronização em duplicidade
 * (um `@Cron` local dispararia uma vez por réplica — bug real de escala,
 * não só de estilo).
 *
 * Sem `INEP_SYNC_CRON` configurado, nenhum job repetível é criado — a
 * sincronização nacional continua disponível sob demanda via
 * `POST /geo/inep-sync`, honesto com o operador em vez de inventar um
 * agendamento que ele nunca pediu.
 */
@Injectable()
export class InepSyncSchedulerService implements OnModuleInit {
  private readonly logger = new Logger(InepSyncSchedulerService.name);
  private readonly config: GeoConfig;

  constructor(
    configService: ConfigService,
    @InjectQueue(INEP_SYNC_QUEUE)
    private readonly inepSyncQueue: Queue<InepSyncJobData>,
  ) {
    this.config = configService.get<GeoConfig>("geo")!;
  }

  async onModuleInit(): Promise<void> {
    if (!this.config.inepSyncCron) {
      this.logger.log(
        "INEP_SYNC_CRON não configurado — sincronização nacional automática desativada (só manual via POST /geo/inep-sync).",
      );
      return;
    }

    const ano = this.config.inepSyncAno ?? new Date().getFullYear() - 1;

    await this.inepSyncQueue.upsertJobScheduler(
      JOB_SCHEDULER_ID,
      { pattern: this.config.inepSyncCron },
      {
        name: "inep-sync-automatico",
        data: { ano },
        opts: { attempts: 3, backoff: { type: "exponential", delay: 60_000 } },
      },
    );

    this.logger.log(
      `Sincronização INEP automática registrada: cron "${this.config.inepSyncCron}", ano ${ano}.`,
    );
  }
}
