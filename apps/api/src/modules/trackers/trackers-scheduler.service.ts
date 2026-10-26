import { Injectable, Logger, type OnModuleInit } from "@nestjs/common";

import { QstashScheduleService } from "@/infra/queue/qstash/qstash-schedule.service";

const SCHEDULE_ID = "trackers-viagens-sem-sinal";

/**
 * De dez em dez minutos.
 *
 * Não é de madrugada como a limpeza de retenção, e a diferença é o
 * ponto: esta varredura existe para fechar uma viagem AINDA HOJE, antes
 * de a família ficar a tarde inteira vendo o ônibus parado no mesmo
 * ponto. Esperar a madrugada entregaria o conserto depois do estrago.
 *
 * Dez minutos somados aos vinte de `TRACKER_TIMEOUT_MINUTOS` dão trinta
 * no pior caso entre o ônibus emudecer e a viagem fechar, e trinta
 * minutos é menos que o intervalo entre dois turnos escolares.
 */
const CRON = "*/10 * * * *";

/**
 * Registra o agendamento da varredura de viagens sem sinal.
 *
 * Mesmo padrão de `DataRetentionSchedulerService`, inclusive no aviso:
 * sem `QSTASH_TOKEN`/`API_PUBLIC_URL` nenhum agendamento é criado, e
 * isso é dito no log em vez de silenciado. Uma varredura que não roda é
 * invisível até alguém perguntar por que o ônibus aparece andando às
 * onze da noite.
 */
@Injectable()
export class TrackersSchedulerService implements OnModuleInit {
  private readonly logger = new Logger(TrackersSchedulerService.name);

  constructor(private readonly qstashSchedule: QstashScheduleService) {}

  async onModuleInit(): Promise<void> {
    if (!this.qstashSchedule.isConfigured) {
      this.logger.warn(
        "QSTASH_TOKEN/API_PUBLIC_URL não configurados: varredura de viagens sem sinal DESATIVADA. " +
          "Viagem cujo rastreador emudeceu vai ficar EM_ANDAMENTO até alguém encerrar à mão.",
      );
      return;
    }

    await this.qstashSchedule.upsertSchedule(SCHEDULE_ID, "trackers/viagens-sem-sinal", CRON, {});
    this.logger.log(`Varredura de viagens sem sinal registrada: "${CRON}".`);
  }
}
