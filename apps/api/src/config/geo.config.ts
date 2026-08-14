import { registerAs } from "@nestjs/config";

const DEFAULT_NOMINATIM_BASE_URL = "https://nominatim.openstreetmap.org";
const DEFAULT_OSRM_BASE_URL = "https://router.project-osrm.org";
/** Exigido pela politica de uso do Nominatim publico (identifica a aplicacao que faz a chamada) — sobrescrevivel, nunca lido de `process.env` fora deste arquivo. */
const DEFAULT_NOMINATIM_USER_AGENT = "RottaGeoPlatform/1.0 (+https://rotta.com.br)";

export interface GeoConfig {
  /** Instancia Nominatim usada para geocodificacao — publica por padrao, self-hosted em producao de escala nacional (ver comentario em `GeoEngineService`). */
  nominatimBaseUrl: string;
  nominatimUserAgent: string;
  /** Instancia OSRM usada para rotas — publica (demo, sem SLA) por padrao. */
  osrmBaseUrl: string;
  /** Cron do Education Sync Agent (QStash Schedules) — sobrescreve o padrão mensal usado automaticamente quando o QStash está configurado (ver `InepSyncSchedulerService`). */
  inepSyncCron: string | undefined;
  /** Ano do Censo Escolar sincronizado automaticamente; sem `INEP_SYNC_ANO`, usa o ano corrente - 1 (o INEP publica com defasagem). */
  inepSyncAno: number | undefined;
}

/**
 * Configuracao do Rotta Geo Engine (briefing "ROTTA GEO PLATFORM" —
 * "Nenhum modulo podera acessar diretamente o [provedor de mapas].
 * Todos deverao utilizar exclusivamente o Rotta Geo Engine."). Ao
 * contrario do Mapbox (que este projeto usava antes), Nominatim/OSRM
 * nao exigem nenhum token — a aplicacao sobe e funciona plenamente com
 * os valores padrao (instancias publicas OSM), sem nenhuma variavel de
 * ambiente obrigatoria. `NOMINATIM_BASE_URL`/`OSRM_BASE_URL` existem
 * para apontar a instancias self-hosted quando o volume de producao
 * (escala nacional) exigir — ver a divulgacao honesta no topo de
 * `GeoEngineService`.
 */
export default registerAs("geo", (): GeoConfig => ({
  nominatimBaseUrl: process.env.NOMINATIM_BASE_URL || DEFAULT_NOMINATIM_BASE_URL,
  nominatimUserAgent: process.env.NOMINATIM_USER_AGENT || DEFAULT_NOMINATIM_USER_AGENT,
  osrmBaseUrl: process.env.OSRM_BASE_URL || DEFAULT_OSRM_BASE_URL,
  inepSyncCron: process.env.INEP_SYNC_CRON || undefined,
  inepSyncAno: process.env.INEP_SYNC_ANO ? Number(process.env.INEP_SYNC_ANO) : undefined,
}));
