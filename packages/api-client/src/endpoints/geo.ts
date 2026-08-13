import { buildQueryString } from "../query.util";

import type { ApiClient } from "../http";
import type { SchoolStatus } from "./schools";

/**
 * Endpoints tipados do Rotta Geo Platform (briefing "ROTTA GEO
 * PLATFORM") — espelham `apps/api/src/modules/geo`. Leitura de
 * marcadores do mapa (Map Intelligence Agent), consumida pelo
 * `@rotta/maps` (mobile) e pelo wrapper MapLibre GL JS de
 * `apps/web`/`apps/admin`, MAIS `syncInep` (Education Sync Agent) — o
 * catálogo `School` é compartilhado e global (sem `companyId`, ver
 * `schema.prisma`), então SEM disparar essa sincronização pelo menos
 * uma vez em produção não existe NENHUMA escola pra nenhuma empresa —
 * a tela `(admin)/escolas` (Admin Rotta, `SYNC_ROLES` no backend) é
 * onde isso acontece.
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

    /**
     * Education Sync Agent — dispara a sincronização com o Censo
     * Escolar (INEP/MEC) do `ano` informado. Responde assim que o job
     * é publicado na fila (não espera o download+parse+diff terminar,
     * pode levar minutos) — só Admin Rotta (`SYNC_ROLES`).
     */
    syncInep: async (ano: number): Promise<{ messageId: string; ano: number }> =>
      (
        await apiClient.request<ApiEnvelope<{ messageId: string; ano: number }>>(
          `/geo/inep-sync${buildQueryString({ ano })}`,
          { method: "POST" },
        )
      ).data,
  };
}
