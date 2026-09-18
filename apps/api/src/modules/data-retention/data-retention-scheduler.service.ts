import { Injectable, Logger, type OnModuleInit } from "@nestjs/common";

import { QstashScheduleService } from "@/infra/queue/qstash/qstash-schedule.service";

const SCHEDULE_ID = "data-retention-daily";

/**
 * Todo dia às 4h em Brasília (7h UTC) — de madrugada de propósito:
 * é quando não há viagem em andamento, então a limpeza não disputa
 * banco com a ingestão de GPS.
 */
const DAILY_CRON = "0 7 * * *";

/**
 * Registra o agendamento QStash da limpeza de retenção, mesmo padrão de
 * `DocumentExpirySchedulerService`. Sem `QSTASH_TOKEN`/`API_PUBLIC_URL`,
 * nenhum agendamento é criado — e isso é dito no log, não silenciado:
 * uma limpeza que não roda é invisível até o banco encher.
 */
@Injectable()
export class DataRetentionSchedulerService implements OnModuleInit {
  private readonly logger = new Logger(DataRetentionSchedulerService.name);

  constructor(private readonly qstashSchedule: QstashScheduleService) {}

  async onModuleInit(): Promise<void> {
    if (!this.qstashSchedule.isConfigured) {
      this.logger.warn(
        "QSTASH_TOKEN/API_PUBLIC_URL não configurados — limpeza de posições antigas DESATIVADA. " +
          "A tabela `trip_positions` vai crescer sem limite até isto ser configurado.",
      );
      return;
    }

    await this.qstashSchedule.upsertSchedule(SCHEDULE_ID, "data-retention/daily", DAILY_CRON, {});
    this.logger.log(`Limpeza diária de posições antigas registrada: "${DAILY_CRON}".`);
  }
}
