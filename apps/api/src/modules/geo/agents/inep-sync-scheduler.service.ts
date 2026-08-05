import { Injectable, Logger, type OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import { INEP_SYNC_QUEUE } from "../geo.constants";

import type { GeoConfig } from "@/config/geo.config";

import { QstashScheduleService } from "@/infra/queue/qstash/qstash-schedule.service";

const SCHEDULE_ID = "inep-sync-nacional";

/**
 * Automatiza o Education Sync Agent (briefing "quero tudo automatizado")
 * registrando um QStash Schedule (`QstashScheduleService.upsertSchedule`)
 * em vez de um `@Cron` do `@nestjs/schedule`: o agendamento fica
 * coordenado do lado do QStash, então múltiplas réplicas/regiões da
 * API numa implantação em escala nacional nunca disparam a mesma
 * sincronização em duplicidade (um `@Cron` local dispararia uma vez
 * por réplica — bug real de escala, não só de estilo).
 *
 * Sem `INEP_SYNC_CRON` configurado, nenhum agendamento é criado — a
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
    private readonly qstashSchedule: QstashScheduleService,
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

    await this.qstashSchedule.upsertSchedule(
      SCHEDULE_ID,
      `geo/${INEP_SYNC_QUEUE}`,
      this.config.inepSyncCron,
      { ano },
    );

    this.logger.log(
      `Sincronização INEP automática registrada: cron "${this.config.inepSyncCron}", ano ${ano}.`,
    );
  }
}
