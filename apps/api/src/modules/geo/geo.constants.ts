/** Tokens de injeção de dependência do módulo Geo (Repository Pattern, Dossiê 12 Seção 6.1). */
export const SCHOOL_COORDINATE_REPOSITORY = Symbol("SCHOOL_COORDINATE_REPOSITORY");
export const SCHOOL_MARKER_REPOSITORY = Symbol("SCHOOL_MARKER_REPOSITORY");

/**
 * Filas BullMQ do módulo Geo (Dossiê 14 — infraestrutura de filas já
 * registrada globalmente em `QueueModule`, nunca usada por nenhum
 * módulo até o Education Sync Agent precisar de escala nacional).
 *
 * `SCHOOL_GEOCODE_QUEUE`: um job por escola nova/alterada — o worker
 * (`SchoolGeocodeProcessor`) chama `GeoPipelineService.geocodeSchool`.
 * Processado com concorrência limitada (ver `SchoolGeocodeProcessor`)
 * para nunca estourar o rate limit do provedor de geocodificação.
 *
 * `INEP_SYNC_QUEUE`: um job por rodada de sincronização (`{ ano }`) —
 * o worker (`InepSyncProcessor`) chama `InepSyncService.sincronizar`.
 * Tira o download+parse+diff do Censo Escolar (potencialmente
 * demorado) de dentro da requisição HTTP; `POST /geo/inep-sync`
 * apenas enfileira e responde imediatamente.
 */
export const SCHOOL_GEOCODE_QUEUE = "school-geocode";
export const INEP_SYNC_QUEUE = "inep-sync";
