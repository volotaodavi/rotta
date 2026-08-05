/** Tokens de injeção de dependência do módulo Geo (Repository Pattern, Dossiê 12 Seção 6.1). */
export const SCHOOL_COORDINATE_REPOSITORY = Symbol("SCHOOL_COORDINATE_REPOSITORY");
export const SCHOOL_MARKER_REPOSITORY = Symbol("SCHOOL_MARKER_REPOSITORY");

/**
 * Rotas/flowControlKeys dos jobs assíncronos do módulo Geo (Dossiê 14
 * — publicados via QStash, ver `QstashPublisherService`; o "worker" é
 * `GeoQueueController`, um endpoint HTTP por rota abaixo).
 *
 * `SCHOOL_GEOCODE_QUEUE`: um job por escola nova/alterada —
 * `GeoQueueController.schoolGeocode` chama
 * `GeoPipelineService.geocodeSchool`. Publicado com `flowControl`
 * limitado (ver `InepSyncService.enfileirarGeocodificacao`) para nunca
 * estourar o rate limit do provedor de geocodificação.
 *
 * `INEP_SYNC_QUEUE`: um job por rodada de sincronização (`{ ano }`) —
 * `GeoQueueController.inepSyncJob` chama `InepSyncService.sincronizar`.
 * Tira o download+parse+diff do Censo Escolar (potencialmente
 * demorado) de dentro da requisição HTTP; `POST /geo/inep-sync`
 * apenas publica o job e responde imediatamente.
 */
export const SCHOOL_GEOCODE_QUEUE = "school-geocode";
export const INEP_SYNC_QUEUE = "inep-sync";
