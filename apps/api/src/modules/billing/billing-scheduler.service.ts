import { Injectable, Logger, type OnModuleInit } from "@nestjs/common";

import { QstashScheduleService } from "@/infra/queue/qstash/qstash-schedule.service";

const SCHEDULE_ID = "billing-reissue-pix";

/**
 * Diário, 09h UTC (06h em horário de Brasília) — cedo o bastante pra
 * quem for reemitir o Pix ter o dia inteiro pra receber o aviso e
 * pagar, sem incomodar de madrugada.
 */
const REISSUE_PIX_CRON = "0 9 * * *";

const EXPIRE_PENDING_SUBSCRIPTIONS_SCHEDULE_ID = "billing-expire-pending-subscriptions";

/**
 * De hora em hora — a janela é de 48h (`PRE_SIGNUP_EXPIRES_HOURS`,
 * decisão do usuário), então checar a cada hora já reembolsa qualquer
 * pagamento não-reclamado bem perto do prazo, sem precisar de nada mais
 * granular do que isso.
 */
const EXPIRE_PENDING_SUBSCRIPTIONS_CRON = "0 * * * *";

/**
 * Automatiza `BillingService.processarVencimentosPix` (Dossiê 26 —
 * "Pix recorrente") registrando um QStash Schedule, mesmo padrão de
 * `InepSyncSchedulerService`: coordenado do lado do QStash, então
 * múltiplas réplicas da API nunca disparam o mesmo processamento em
 * duplicidade. Sem `QSTASH_TOKEN`/`API_PUBLIC_URL` configurados, nenhum
 * agendamento é criado — o processamento continua disponível sob
 * demanda (nenhum endpoint manual equivalente ainda, mas o método do
 * service pode ser chamado diretamente em teste/consola se precisar).
 */
@Injectable()
export class BillingSchedulerService implements OnModuleInit {
  private readonly logger = new Logger(BillingSchedulerService.name);

  constructor(private readonly qstashSchedule: QstashScheduleService) {}

  async onModuleInit(): Promise<void> {
    if (!this.qstashSchedule.isConfigured) {
      this.logger.log(
        "QSTASH_TOKEN/API_PUBLIC_URL não configurados — reenvio automático de Pix desativado (sem agendamento).",
      );
      return;
    }

    await this.qstashSchedule.upsertSchedule(
      SCHEDULE_ID,
      "billing/reissue-pix",
      REISSUE_PIX_CRON,
      {},
    );
    this.logger.log(`Reenvio automático de Pix registrado: cron "${REISSUE_PIX_CRON}".`);

    await this.qstashSchedule.upsertSchedule(
      EXPIRE_PENDING_SUBSCRIPTIONS_SCHEDULE_ID,
      "billing/expire-pending-subscriptions",
      EXPIRE_PENDING_SUBSCRIPTIONS_CRON,
      {},
    );
    this.logger.log(
      `Expiração/reembolso de PendingSubscription registrado: cron "${EXPIRE_PENDING_SUBSCRIPTIONS_CRON}".`,
    );
  }
}
