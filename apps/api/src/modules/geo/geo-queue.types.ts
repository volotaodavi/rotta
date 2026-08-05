/** Payload do job de geocodificação publicado via QStash — ver `GeoQueueController.geocodeSchool`. */
export interface SchoolGeocodeJobData {
  schoolId: string;
}

/** Payload do job de sincronização INEP publicado via QStash — ver `GeoQueueController.inepSync`. */
export interface InepSyncJobData {
  ano: number;
}
