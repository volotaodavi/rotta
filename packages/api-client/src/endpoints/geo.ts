import { buildQueryString } from "../query.util";

import type { ApiClient } from "../http";
import type { School, SchoolAdministrativeDependency, SchoolStatus } from "./schools";

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

export interface Coordenada {
  latitude: number;
  longitude: number;
}

/** Espelha `GeocodeResult` (`apps/api/src/modules/geo/geo-engine.types.ts`). */
export interface GeocodeResult {
  latitude: number;
  longitude: number;
  /** Texto livre do provedor (`importance` do Nominatim, 0 a 1) — não é uma métrica de confiança calibrada, só um sinal relativo. */
  precisao: string;
  enderecoFormatado: string;
  logradouro: string | null;
  bairro: string | null;
  cidade: string | null;
  estado: string | null;
}

/** Espelha `DirectionsResult` — `geometria` é um GeoJSON `LineString` (`{ coordinates: [lng, lat][] }`), pronto pra virar o `route` de `RottaMap` depois de inverter cada par. */
export interface RoutePreviewResult {
  distanciaMetros: number;
  duracaoSegundos: number;
  geometria: { type: "LineString"; coordinates: [number, number][] };
  pernas: { distanciaMetros: number; duracaoSegundos: number }[];
}

/** `POST /geo/schools/quick-register` — só os campos que o Responsável realmente sabe de cabeça no meio do cadastro do filho. */
export interface QuickRegisterSchoolInput {
  nomeOficial: string;
  dependenciaAdministrativa: SchoolAdministrativeDependency;
  cep: string;
  logradouro: string;
  numero: string;
  bairro: string;
  cidade: string;
  estado: string;
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

    /**
     * Endereço em texto livre → coordenada (Nominatim). Usado pelo
     * cadastro de Aluno pra achar o ponto de embarque digitado no
     * formulário e desenhar a rota traçada até a escola escolhida.
     */
    geocodeAddress: async (endereco: string): Promise<GeocodeResult> =>
      (
        await apiClient.request<ApiEnvelope<GeocodeResult>>("/geo/geocode", {
          method: "POST",
          body: { endereco },
        })
      ).data,

    /** Prévia de rota entre dois pontos (OSRM) — só visualização, não persiste nada. */
    getRoutePreview: async (input: {
      origem: Coordenada;
      destino: Coordenada;
      paradas?: Coordenada[];
    }): Promise<RoutePreviewResult> =>
      (
        await apiClient.request<ApiEnvelope<RoutePreviewResult>>("/geo/rota-previa", {
          method: "POST",
          body: input,
        })
      ).data,

    /**
     * Autocadastro rápido de escola pela Geocoding AI Agent — usado
     * pelo cadastro de Aluno quando a busca no catálogo não encontra a
     * escola (nunca espera pela sincronização nacional do Censo Escolar,
     * `syncInep`, pra existir pelo menos essa escola). Devolve a escola
     * já criada (`status: "EM_ANALISE"`) e, quando o endereço foi
     * localizado, já com `latitude`/`longitude` reais.
     */
    quickRegisterSchool: async (input: QuickRegisterSchoolInput): Promise<School> =>
      (
        await apiClient.request<ApiEnvelope<School>>("/geo/schools/quick-register", {
          method: "POST",
          body: input,
        })
      ).data,
  };
}
