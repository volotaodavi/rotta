import { Injectable, Logger, type OnModuleInit } from "@nestjs/common";

import { QstashScheduleService } from "@/infra/queue/qstash/qstash-schedule.service";

const SCHEDULE_ID = "document-expiry-daily";

/** Todo dia, 12h30 em Brasília (15h30 UTC) — meia hora depois do aviso de trial, pra nunca disparar exatamente junto. */
const DAILY_CRON = "30 15 * * *";

/**
 * Registra o agendamento QStash diário do lembrete de documento
 * vencendo (pedido do usuário 01/09/2026: "CNH/documento vencendo"),
 * mesmo padrão de `TrialNotificationsSchedulerService`/
 * `AdminDigestSchedulerService`. Sem `QSTASH_TOKEN`/`API_PUBLIC_URL`
 * configurados, nenhum agendamento é criado.
 */
@Injectable()
export class DocumentExpirySchedulerService implements OnModuleInit {
  private readonly logger = new Logger(DocumentExpirySchedulerService.name);

  constructor(private readonly qstashSchedule: QstashScheduleService) {}

  async onModuleInit(): Promise<void> {
    if (!this.qstashSchedule.isConfigured) {
      this.logger.log(
        "QSTASH_TOKEN/API_PUBLIC_URL não configurados — lembrete diário de vencimento de documento desativado (sem agendamento).",
      );
      return;
    }

    await this.qstashSchedule.upsertSchedule(SCHEDULE_ID, "document-expiry/daily", DAILY_CRON, {});
    this.logger.log(`Lembrete diário de vencimento de documento registrado: "${DAILY_CRON}".`);
  }
}
