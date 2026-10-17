import { Injectable, Logger, type OnModuleInit } from "@nestjs/common";

import { QstashScheduleService } from "@/infra/queue/qstash/qstash-schedule.service";

const GERAR_FATURAS_SCHEDULE_ID = "family-billing-gerar-faturas";

/**
 * Todo dia, 06:40 em Brasília (09:40 UTC).
 *
 * Diário, e não mensal, por dois motivos concretos:
 *
 * 1. A geração é idempotente (`@@unique([contractId, competencia])`),
 *    então rodar todo dia não cria fatura dobrada — e garante que um
 *    contrato ativado no dia 12 receba a fatura do mês corrente no dia
 *    seguinte, em vez de esperar o mês virar.
 * 2. A mesma execução vira `A_VENCER` em `VENCIDA`, que é uma mudança
 *    de estado que depende do dia de hoje e de mais nada.
 *
 * Antes das 7h porque é quando a família abre o app pela primeira vez no
 * dia: a van está chegando, e a fatura do mês já deve estar lá.
 */
const GERAR_FATURAS_CRON = "40 9 * * *";

/**
 * Registra o QStash Schedule da geração mensal de faturas da família —
 * mesmo padrão de `BillingSchedulerService`: coordenado do lado do
 * QStash, então várias réplicas da API nunca disparam a mesma geração em
 * duplicidade. Sem `QSTASH_TOKEN`/`API_PUBLIC_URL`, nenhum agendamento é
 * criado (e isso é dito no log, não escondido).
 */
@Injectable()
export class FamilyBillingSchedulerService implements OnModuleInit {
  private readonly logger = new Logger(FamilyBillingSchedulerService.name);

  constructor(private readonly qstashSchedule: QstashScheduleService) {}

  async onModuleInit(): Promise<void> {
    if (!this.qstashSchedule.isConfigured) {
      this.logger.log(
        "QSTASH_TOKEN/API_PUBLIC_URL não configurados: geração automática de faturas da família desativada (sem agendamento).",
      );
      return;
    }

    await this.qstashSchedule.upsertSchedule(
      GERAR_FATURAS_SCHEDULE_ID,
      "family-billing/gerar-faturas",
      GERAR_FATURAS_CRON,
      {},
    );
    this.logger.log(`Geração de faturas da família registrada: cron "${GERAR_FATURAS_CRON}".`);
  }
}
