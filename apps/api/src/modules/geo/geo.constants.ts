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
 *
 * `REVISAO_MANUAL_REPROCESS_QUEUE`: um job sem payload (achado real
 * testando em produção: a 1ª versão de `POST /geo/revisao-manual/
 * reprocessar` fazia o `listByStatus` + `publishBatchJSON` de milhares
 * de itens DENTRO da própria requisição HTTP — 408 Request Timeout
 * contra a fila real de ~5 mil escolas). Mesmo padrão de
 * `INEP_SYNC_QUEUE`: o endpoint só publica este job (rápido) e
 * responde; `GeoQueueController.revisaoManualReprocessJob` é quem
 * de fato enumera a fila e publica o lote de `SCHOOL_GEOCODE_QUEUE`.
 */
export const SCHOOL_GEOCODE_QUEUE = "school-geocode";
export const INEP_SYNC_QUEUE = "inep-sync";
export const REVISAO_MANUAL_REPROCESS_QUEUE = "revisao-manual-reprocess";
