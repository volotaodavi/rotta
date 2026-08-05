import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Client } from "@upstash/qstash";

import type { AppConfig } from "@/config/app.config";
import type { QstashConfig } from "@/config/qstash.config";

/**
 * Agendamento recorrente via QStash Schedules — substitui
 * `Queue.upsertJobScheduler` do BullMQ (Dossie 14, Education Sync
 * Agent): o cron fica coordenado no lado do QStash, então múltiplas
 * réplicas/regiões da API nunca disparam a mesma sincronização em
 * duplicidade (mesmo motivo pelo qual o antigo código evitava um
 * `@Cron` local do `@nestjs/schedule`).
 *
 * `scheduleId` estável (passado por quem chama) torna `upsertSchedule`
 * idempotente — chamar de novo no boot com o mesmo id apenas atualiza o
 * agendamento existente em vez de duplicá-lo.
 */
@Injectable()
export class QstashScheduleService {
  private readonly logger = new Logger(QstashScheduleService.name);
  private readonly client: Client;
  private readonly qstashConfig: QstashConfig;
  private readonly appConfig: AppConfig;

  constructor(configService: ConfigService) {
    this.qstashConfig = configService.get<QstashConfig>("qstash")!;
    this.appConfig = configService.get<AppConfig>("app")!;
    this.client = new Client({ token: this.qstashConfig.token });
  }

  get isConfigured(): boolean {
    return Boolean(this.qstashConfig.token && this.qstashConfig.apiPublicUrl);
  }

  async upsertSchedule<TBody>(
    scheduleId: string,
    route: string,
    cron: string,
    body: TBody,
  ): Promise<void> {
    if (!this.isConfigured) {
      this.logger.warn(
        `QSTASH_TOKEN/API_PUBLIC_URL não configurados — agendamento "${scheduleId}" não foi criado.`,
      );
      return;
    }

    await this.client.schedules.create({
      scheduleId,
      cron,
      destination: `${this.qstashConfig.apiPublicUrl}/${this.appConfig.apiPrefix}/internal/queue/${route}`,
      body: JSON.stringify(body),
      headers: { "Content-Type": "application/json" },
      retries: 3,
    });
  }
}
