import { registerAs } from "@nestjs/config";

export interface GeoConfig {
  mapboxAccessToken: string | undefined;
  /** Cron BullMQ (Redis-coordenado) do Education Sync Agent — ausente = sincronização só manual. */
  inepSyncCron: string | undefined;
  /** Ano do Censo Escolar sincronizado automaticamente; sem `INEP_SYNC_ANO`, usa o ano corrente - 1 (o INEP publica com defasagem). */
  inepSyncAno: number | undefined;
}

/**
 * Configuracao do Rotta Geo Engine (briefing "ROTTA GEO PLATFORM" —
 * "Nenhum modulo podera acessar diretamente o Mapbox. Todos deverao
 * utilizar exclusivamente o Rotta Geo Engine."). `mapboxAccessToken` e
 * opcional: um ambiente sem o token configurado sobe normalmente, e
 * `GeoEngineService` recusa chamadas ao Mapbox com um erro claro em vez
 * de falhar ao iniciar a aplicacao inteira (mesma decisao de
 * `storage.config.ts`/Supabase).
 */
export default registerAs("geo", (): GeoConfig => ({
  mapboxAccessToken: process.env.MAPBOX_ACCESS_TOKEN || undefined,
  inepSyncCron: process.env.INEP_SYNC_CRON || undefined,
  inepSyncAno: process.env.INEP_SYNC_ANO ? Number(process.env.INEP_SYNC_ANO) : undefined,
}));
