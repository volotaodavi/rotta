/** Payload do job de geocodificação publicado via QStash — ver `GeoQueueController.geocodeSchool`. */
export interface SchoolGeocodeJobData {
  schoolId: string;
}

/** Payload do job de sincronização INEP publicado via QStash — ver `GeoQueueController.inepSync`. */
export interface InepSyncJobData {
  ano: number;
  /**
   * `true` só quando publicado por `InepSyncSchedulerService` (execução
   * automática/agendada) — habilita `sincronizarComFallbackDeAno` pra
   * cobrir o INEP ainda não ter publicado o Censo do ano corrente.
   * Ausente/`false` no disparo manual (`POST /geo/inep-sync?ano=X`), que
   * sempre sincroniza exatamente o ano pedido, sem trocar por conta própria.
   */
  permitirAnoAnterior?: boolean;
}
