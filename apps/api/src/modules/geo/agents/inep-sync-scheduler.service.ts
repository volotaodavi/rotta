import { Injectable, Logger, type OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import { INEP_SYNC_QUEUE } from "../geo.constants";

import type { GeoConfig } from "@/config/geo.config";

import { QstashScheduleService } from "@/infra/queue/qstash/qstash-schedule.service";

const SCHEDULE_ID = "inep-sync-nacional";

/**
 * Cron usado quando `INEP_SYNC_CRON` não foi definido explicitamente
 * mas o QStash já está configurado (`QSTASH_TOKEN` + `API_PUBLIC_URL`
 * setados no ambiente) — dia 1 de cada mês, 04h UTC (01h em horário de
 * Brasília, fora do horário de pico). O INEP publica o Censo Escolar
 * uma vez por ano, então mensal já é generoso o bastante pra pegar
 * correções/republicações sem reprocessar ~200 mil linhas sem
 * necessidade. Pedido do usuário: "Automático, mas o QStash já está no
 * Render" — com o token presente, exigir MAIS uma variável só pra
 * escolher a frequência deixava de ser automação de verdade. Continua
 * sobrescrevível setando `INEP_SYNC_CRON` explicitamente.
 */
const DEFAULT_INEP_SYNC_CRON = "0 4 1 * *";

/**
 * Automatiza o Education Sync Agent (briefing "quero tudo automatizado")
 * registrando um QStash Schedule (`QstashScheduleService.upsertSchedule`)
 * em vez de um `@Cron` do `@nestjs/schedule`: o agendamento fica
 * coordenado do lado do QStash, então múltiplas réplicas/regiões da
 * API numa implantação em escala nacional nunca disparam a mesma
 * sincronização em duplicidade (um `@Cron` local dispararia uma vez
 * por réplica — bug real de escala, não só de estilo).
 *
 * A ÚNICA credencial que importa pra automação de verdade é o QStash
 * (`QSTASH_TOKEN` + `API_PUBLIC_URL`) — uma vez configurado, o
 * agendamento nasce sozinho com `DEFAULT_INEP_SYNC_CRON` (sem exigir
 * mais nenhuma variável). `INEP_SYNC_CRON` continua existindo só pra
 * quem quiser uma frequência diferente da padrão. Sem QStash
 * configurado, nenhum agendamento é criado — a sincronização nacional
 * continua disponível sob demanda via `POST /geo/inep-sync`, honesto
 * com o operador em vez de inventar um agendamento que não tem como
 * ser entregue (não existe endpoint público alcançável pelo QStash).
 */
@Injectable()
export class InepSyncSchedulerService implements OnModuleInit {
  private readonly logger = new Logger(InepSyncSchedulerService.name);
  private readonly config: GeoConfig;

  constructor(
    configService: ConfigService,
    private readonly qstashSchedule: QstashScheduleService,
  ) {
    this.config = configService.get<GeoConfig>("geo")!;
  }

  async onModuleInit(): Promise<void> {
    if (!this.qstashSchedule.isConfigured) {
      this.logger.log(
        "QSTASH_TOKEN/API_PUBLIC_URL não configurados — sincronização nacional automática desativada (só manual via POST /geo/inep-sync).",
      );
      return;
    }

    const cron = this.config.inepSyncCron ?? DEFAULT_INEP_SYNC_CRON;
    const ano = this.config.inepSyncAno ?? new Date().getFullYear() - 1;

    // `permitirAnoAnterior: true` — só a execução automática pode cair
    // pro ano anterior quando o INEP ainda não publicou o Censo do ano
    // corrente (achado real: `.../2025.zip` → 404 até a publicação
    // oficial); ver `InepSyncService.sincronizarComFallbackDeAno`.
    await this.qstashSchedule.upsertSchedule(SCHEDULE_ID, `geo/${INEP_SYNC_QUEUE}`, cron, {
      ano,
      permitirAnoAnterior: true,
    });

    const origem = this.config.inepSyncCron
      ? "INEP_SYNC_CRON"
      : "padrão mensal (sem INEP_SYNC_CRON)";
    this.logger.log(
      `Sincronização INEP automática registrada: cron "${cron}" (${origem}), ano ${ano}.`,
    );
  }
}
