import { Injectable, Logger, type OnModuleInit } from "@nestjs/common";

import { QstashScheduleService } from "@/infra/queue/qstash/qstash-schedule.service";

const SCHEDULE_ID = "trial-notifications-daily";

/** Todo dia, 12h em Brasília (15h UTC) — meio da tarde, depois de qualquer job matinal (billing, admin-digest). */
const DAILY_CRON = "0 15 * * *";

/**
 * Registra o agendamento QStash diário do aviso de trial (pedido do
 * usuário 01/09/2026), mesmo padrão de `AdminDigestSchedulerService`.
 * Sem `QSTASH_TOKEN`/`API_PUBLIC_URL` configurados, nenhum agendamento
 * é criado — o job continua chamável sob demanda
 * (`TrialNotificationsService.avaliarTodasAsEmpresas`).
 */
@Injectable()
export class TrialNotificationsSchedulerService implements OnModuleInit {
  private readonly logger = new Logger(TrialNotificationsSchedulerService.name);

  constructor(private readonly qstashSchedule: QstashScheduleService) {}

  async onModuleInit(): Promise<void> {
    if (!this.qstashSchedule.isConfigured) {
      this.logger.log(
        "QSTASH_TOKEN/API_PUBLIC_URL não configurados — aviso diário de trial desativado (sem agendamento).",
      );
      return;
    }

    await this.qstashSchedule.upsertSchedule(
      SCHEDULE_ID,
      "trial-notifications/daily",
      DAILY_CRON,
      {},
    );
    this.logger.log(`Aviso diário de trial registrado: "${DAILY_CRON}".`);
  }
}
