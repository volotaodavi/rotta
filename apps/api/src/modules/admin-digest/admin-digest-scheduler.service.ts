import { Injectable, Logger, type OnModuleInit } from "@nestjs/common";

import { QstashScheduleService } from "@/infra/queue/qstash/qstash-schedule.service";

const WEEKLY_SCHEDULE_ID = "admin-digest-weekly";
const MONTHLY_SCHEDULE_ID = "admin-digest-monthly";

/** Toda segunda, 08h em Brasília (11h UTC) — começo de semana, dá tempo do Admin ler antes do expediente. */
const WEEKLY_CRON = "0 11 * * 1";

/** Todo dia 1º do mês, 08h em Brasília (11h UTC) — mesma lógica da semanal. */
const MONTHLY_CRON = "0 11 1 * *";

/**
 * Registra os dois agendamentos QStash do "informativo da Rotta" pro
 * Admin (pedido do usuário 01/09/2026), mesmo padrão de
 * `BillingSchedulerService`/`InepSyncSchedulerService`: coordenado do
 * lado do QStash, então múltiplas réplicas da API nunca disparam o
 * mesmo resumo em duplicidade. Sem `QSTASH_TOKEN`/`API_PUBLIC_URL`
 * configurados, nenhum agendamento é criado — o resumo continua
 * disponível sob demanda (`AdminDigestService.enviarResumo`, chamável
 * direto em teste/consola se precisar).
 */
@Injectable()
export class AdminDigestSchedulerService implements OnModuleInit {
  private readonly logger = new Logger(AdminDigestSchedulerService.name);

  constructor(private readonly qstashSchedule: QstashScheduleService) {}

  async onModuleInit(): Promise<void> {
    if (!this.qstashSchedule.isConfigured) {
      this.logger.log(
        "QSTASH_TOKEN/API_PUBLIC_URL não configurados — resumo semanal/mensal do Admin Rotta desativado (sem agendamento).",
      );
      return;
    }

    await this.qstashSchedule.upsertSchedule(
      WEEKLY_SCHEDULE_ID,
      "admin-digest/weekly",
      WEEKLY_CRON,
      {},
    );
    await this.qstashSchedule.upsertSchedule(
      MONTHLY_SCHEDULE_ID,
      "admin-digest/monthly",
      MONTHLY_CRON,
      {},
    );
    this.logger.log(
      `Resumo do Admin Rotta registrado: semanal "${WEEKLY_CRON}", mensal "${MONTHLY_CRON}".`,
    );
  }
}
