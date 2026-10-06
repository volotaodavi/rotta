import { Injectable, Logger, type OnModuleInit } from "@nestjs/common";

import { QstashScheduleService } from "@/infra/queue/qstash/qstash-schedule.service";

const EXPIRE_PENDING_SUBSCRIPTIONS_SCHEDULE_ID = "billing-expire-pending-subscriptions";

/**
 * De hora em hora — a janela é de 48h (`PRE_SIGNUP_EXPIRES_HOURS`,
 * decisão do usuário), então checar a cada hora já reembolsa qualquer
 * pagamento não-reclamado bem perto do prazo, sem precisar de nada mais
 * granular do que isso.
 */
const EXPIRE_PENDING_SUBSCRIPTIONS_CRON = "0 * * * *";

const COBRANCA_SCHEDULE_ID = "billing-cobrar-pendencias";

/**
 * Uma vez por dia, 09:20 em Brasília (12:20 UTC).
 *
 * Horário escolhido, não sorteado: cobrança que chega de madrugada
 * parece robô e cobrança que chega no fim do dia fica para amanhã. Meio
 * da manhã de um dia útil é quando uma transportadora pequena está com
 * o celular na mão entre uma rota e outra.
 *
 * Diário porque o próprio serviço já segura o intervalo de três dias
 * por empresa: rodar todo dia só garante que ninguém espere mais do que
 * precisa, sem nunca virar repetição.
 */
const COBRANCA_CRON = "20 12 * * 1-5";

/**
 * Registra o QStash Schedule de `BillingService.
 * processarPendingSubscriptionsExpiradas`, mesmo padrão de
 * `InepSyncSchedulerService`: coordenado do lado do QStash, então
 * múltiplas réplicas da API nunca disparam o mesmo processamento em
 * duplicidade. Sem `QSTASH_TOKEN`/`API_PUBLIC_URL` configurados, nenhum
 * agendamento é criado.
 *
 * Até 05/09/2026 este service também registrava o reenvio automático de
 * Pix da AbacatePay (`billing/reissue-pix` — "Pix recorrente" simulado,
 * já que a AbacatePay não tinha assinatura Pix de verdade). Removido
 * junto com o resto da AbacatePay (pedido do usuário: "Nós usaremos
 * 100% Asaas, esquece a AbacatePay") — a Asaas renova Pix nativamente
 * via assinatura, sem precisar de job nenhum.
 */
@Injectable()
export class BillingSchedulerService implements OnModuleInit {
  private readonly logger = new Logger(BillingSchedulerService.name);

  constructor(private readonly qstashSchedule: QstashScheduleService) {}

  async onModuleInit(): Promise<void> {
    if (!this.qstashSchedule.isConfigured) {
      this.logger.log(
        "QSTASH_TOKEN/API_PUBLIC_URL não configurados: expiração automática de PendingSubscription desativada (sem agendamento).",
      );
      return;
    }

    await this.qstashSchedule.upsertSchedule(
      EXPIRE_PENDING_SUBSCRIPTIONS_SCHEDULE_ID,
      "billing/expire-pending-subscriptions",
      EXPIRE_PENDING_SUBSCRIPTIONS_CRON,
      {},
    );
    this.logger.log(
      `Expiração/reembolso de PendingSubscription registrado: cron "${EXPIRE_PENDING_SUBSCRIPTIONS_CRON}".`,
    );

    await this.qstashSchedule.upsertSchedule(
      COBRANCA_SCHEDULE_ID,
      "billing/cobrar-pendencias",
      COBRANCA_CRON,
      {},
    );
    this.logger.log(`Régua de cobrança registrada: cron "${COBRANCA_CRON}".`);
  }
}
