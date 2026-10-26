import { Injectable, Logger, type OnModuleInit } from "@nestjs/common";

import { QstashScheduleService } from "@/infra/queue/qstash/qstash-schedule.service";

const SCHEDULE_ID = "trackers-viagens-sem-sinal";

/**
 * A cada dez minutos, **dentro da janela operacional**, de segunda a
 * sexta. Os campos são UTC, e 8 a 22 UTC é 05h às 19h50 em Brasília.
 *
 * ## Por que uma janela, e não 24 horas
 *
 * Porque este agendamento faz duas coisas, e a segunda é a que decide o
 * horário.
 *
 * A primeira é encerrar viagem muda: fechar ainda hoje a viagem do
 * ônibus que perdeu sinal, antes de a família passar a tarde vendo o
 * carro parado no mesmo ponto. Dez minutos somados aos vinte de
 * `TRACKER_TIMEOUT_MINUTOS` dão trinta no pior caso, menos que o
 * intervalo entre dois turnos escolares.
 *
 * A segunda é **manter a API acordada enquanto a operação acontece**.
 * No plano gratuito do Render o serviço hiberna após 15 minutos sem
 * requisição e leva perto de 90 segundos para voltar, o que para um
 * rastreador é fatal: o receptor encaminha a posição, ninguém atende, e
 * a família vê o ônibus parado. Um agendamento a cada dez minutos
 * nunca deixa os 15 completarem.
 *
 * ## A conta que escolhe a janela
 *
 * A cota gratuita do Render é de **750 horas de instância por mês, por
 * workspace**, e ela não acumula. Quando acaba, **todo serviço gratuito
 * do workspace é suspenso até o dia 1º**. Então manter acordado 24
 * horas é a escolha errada, e por pouco:
 *
 * | Regime                       | Horas/mês | Da cota | Margem |
 * | ---------------------------- | --------- | ------- | ------ |
 * | 24/7, mês de 31 dias         | 744       | 99,2%   | 6 h    |
 * | 24/7, mês de 30 dias         | 720       | 96,0%   | 30 h   |
 * | **Esta janela, seg a sex**   | **330**   | **44%** | 420 h  |
 *
 * Seis horas de margem num mês de 31 dias significa que qualquer
 * reinício, qualquer segundo serviço gratuito no workspace, qualquer
 * mês com um feriado a mais de tráfego derruba a plataforma inteira no
 * dia 28. A janela usa 44% e sobra margem para o resto.
 *
 * Fora da janela ninguém está usando: não há ônibus com ignição ligada,
 * não há monitor fazendo chamada, não há responsável olhando o mapa. A
 * API pode dormir, e o primeiro acesso da manhã a acorda, como já
 * acontece com a landing page (`wakeApi`).
 */
const CRON_JANELA_OPERACIONAL = "*/10 8-22 * * 1-5";

/**
 * Registra o agendamento da varredura de viagens sem sinal, que é
 * também o que mantém a API acordada na janela operacional.
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
          "Viagem cujo rastreador emudeceu vai ficar EM_ANDAMENTO até alguém encerrar à mão, e a " +
          "API vai hibernar no meio da operação.",
      );
      return;
    }

    await this.qstashSchedule.upsertSchedule(
      SCHEDULE_ID,
      "trackers/viagens-sem-sinal",
      CRON_JANELA_OPERACIONAL,
      {},
    );
    this.logger.log(
      `Janela operacional registrada: "${CRON_JANELA_OPERACIONAL}" (05h as 19h50 em Brasilia, seg a sex). ` +
        "Encerra viagem muda e mantem a API acordada enquanto a operacao acontece.",
    );
  }
}
