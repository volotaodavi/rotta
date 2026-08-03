import { buildQueryString } from "../query.util";

import type { ApiClient } from "../http";
import type { SchoolStatus } from "./schools";

/**
 * Endpoints tipados do Rotta Geo Platform (briefing "ROTTA GEO
 * PLATFORM") — espelham `apps/api/src/modules/geo`. Escopo desta
 * primeira fatia: leitura de marcadores do mapa (Map Intelligence
 * Agent), consumida pelo `@rotta/maps` (mobile) e pelo wrapper Mapbox
 * GL JS de `apps/web`/`apps/admin`. Endpoints administrativos (geocode
 * manual, fila de revisão manual, sincronização INEP) ficam para quando
 * as telas de administração da Geo Platform forem construídas.
 */

export interface BoundingBoxInput {
  swLat: number;
  swLng: number;
  neLat: number;
  neLng: number;
}

export interface SchoolMarker {
  id: string;
  nomeOficial: string;
  latitude: number;
  longitude: number;
  status: SchoolStatus;
}

export interface SchoolMarkerComDistancia extends SchoolMarker {
  distanciaMetros: number;
}

interface ApiEnvelope<T> {
  data: T;
}

export function createGeoEndpoints(apiClient: ApiClient) {
  return {
    /** Marcadores de Escola dentro da janela visível do mapa (bounding box). */
    listMarkers: async (bounds: BoundingBoxInput): Promise<SchoolMarker[]> =>
      (
        await apiClient.request<ApiEnvelope<SchoolMarker[]>>(
          `/geo/mapa/marcadores${buildQueryString(bounds)}`,
        )
      ).data,

    /** Escolas mais próximas de um ponto, ordenadas por distância. */
    listNearbySchools: async (params: {
      lat: number;
      lng: number;
      raioKm?: number;
    }): Promise<SchoolMarkerComDistancia[]> =>
      (
        await apiClient.request<ApiEnvelope<SchoolMarkerComDistancia[]>>(
          `/geo/mapa/proximas${buildQueryString(params)}`,
        )
      ).data,
  };
}
