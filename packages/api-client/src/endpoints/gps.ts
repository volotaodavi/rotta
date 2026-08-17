import { buildQueryString } from "../query.util";

import type { TripPosition, TripStudentEvent } from "./trips";
import type { ApiClient } from "../http";

/** Janela de tempo do histórico de embarque/desembarque do Responsável. */
export type StudentEventsHistoryRange = "hoje" | "semana" | "mes";

/**
 * Endpoints tipados do "localizador"/mapa (GPS-01/03/06) — espelham
 * `apps/api/src/modules/gps` (só leitura agregada; a ingestão de
 * posição em si vive em `endpoints/trips.ts`).
 */

export interface MapVehicle {
  tripId: string;
  routeId: string;
  routeNome: string;
  turno: string;
  veiculoId: string;
  placa: string;
  latitude: number | null;
  longitude: number | null;
  ultimaPosicaoEm: string | null;
  motoristaNome: string;
  monitorNome: string | null;
  iniciadaEm: string;
  /** Só vem preenchido no Mapa Nacional de Veículos (Admin Rotta chamando `getMap()` sem `companyId`). */
  companyId?: string;
  companyNome?: string;
}

interface ApiEnvelope<T> {
  data: T;
}

export function createGpsEndpoints(apiClient: ApiClient) {
  return {
    /** Mapa operacional (Empresa/Gestor/Admin Rotta) — todos os veículos em viagem agora. */
    getMap: async (companyId?: string): Promise<MapVehicle[]> =>
      (
        await apiClient.request<ApiEnvelope<MapVehicle[]>>(
          `/gps/map${buildQueryString({ companyId })}`,
        )
      ).data,

    /** Localizador do Responsável — posição atual do transporte do próprio filho, se houver viagem em curso. */
    getForStudent: async (studentId: string): Promise<MapVehicle | null> =>
      (await apiClient.request<ApiEnvelope<MapVehicle | null>>(`/gps/students/${studentId}`)).data,

    /** Trilha histórica de uma viagem específica (linha completa percorrida). */
    getTrack: async (tripId: string): Promise<TripPosition[]> =>
      (await apiClient.request<ApiEnvelope<TripPosition[]>>(`/gps/trips/${tripId}/track`)).data,

    /** Histórico de embarque/desembarque do próprio filho (abas Hoje/Semana/Mês). */
    getStudentEventsHistory: async (
      studentId: string,
      range: StudentEventsHistoryRange = "hoje",
    ): Promise<TripStudentEvent[]> =>
      (
        await apiClient.request<ApiEnvelope<TripStudentEvent[]>>(
          `/gps/students/${studentId}/events-history${buildQueryString({ range })}`,
        )
      ).data,
  };
}

export type GpsEndpoints = ReturnType<typeof createGpsEndpoints>;
