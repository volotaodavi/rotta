import { buildQueryString } from "../query.util";

import type { ApiClient } from "../http";

/**
 * Endpoints tipados do módulo Trips (GPS-01/02/03/06 + EMB-01/05 +
 * DESEMB-01/03) — espelham exatamente `apps/api/src/modules/trips`
 * (DTOs de request/response). O mapa/localizador em si (agregado) vive
 * em `endpoints/gps.ts`.
 */

export type TripStatus = "EM_ANDAMENTO" | "FINALIZADA" | "CANCELADA";
export type TripStudentEventType = "EMBARCOU" | "AUSENTE" | "DESEMBARCOU";

export interface StartTripInput {
  routeId: string;
  veiculoId?: string;
  motoristaId?: string;
  monitorId?: string;
}

export interface Trip {
  id: string;
  companyId: string;
  routeId: string;
  data: string;
  status: TripStatus;
  veiculoId: string;
  motoristaId: string;
  monitorId: string | null;
  iniciadaEm: string;
  finalizadaEm: string | null;
  canceladaEm: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ListTripsResult {
  items: Trip[];
  total: number;
  page: number;
  pageSize: number;
}

export interface IngestPositionInput {
  latitude: number;
  longitude: number;
  precisaoMetros?: number;
  velocidadeKmh?: number;
  /** Timestamp ISO 8601 gerado no dispositivo no momento da captura. */
  capturadaEm: string;
  simuladoSuspeito?: boolean;
}

export interface TripPosition {
  id: string;
  tripId: string;
  latitude: number;
  longitude: number;
  precisaoMetros: number | null;
  velocidadeKmh: number | null;
  capturadaEm: string;
  simuladoSuspeito: boolean;
  createdAt: string;
}

export interface CreateTripStudentEventInput {
  studentId: string;
  tipo: TripStudentEventType;
  motivoAusencia?: string;
}

export interface SubstituirMotoristaInput {
  motoristaId: string;
  motivo?: string;
}

export interface SubstituirVeiculoInput {
  veiculoId: string;
  motivo?: string;
}

export interface SubstituirMonitorInput {
  monitorId?: string | null;
  motivo?: string;
}

export interface TripStudentEvent {
  id: string;
  tripId: string;
  studentId: string;
  routeStopId: string;
  tipo: TripStudentEventType;
  motivoAusencia: string | null;
  processadoPorId: string;
  processadoEm: string;
}

interface ApiEnvelope<T> {
  data: T;
}

export function createTripsEndpoints(apiClient: ApiClient) {
  return {
    start: async (input: StartTripInput): Promise<Trip> =>
      (await apiClient.request<ApiEnvelope<Trip>>("/trips", { method: "POST", body: input })).data,

    getById: async (id: string): Promise<Trip> =>
      (await apiClient.request<ApiEnvelope<Trip>>(`/trips/${id}`)).data,

    finish: async (id: string): Promise<Trip> =>
      (await apiClient.request<ApiEnvelope<Trip>>(`/trips/${id}/finish`, { method: "PATCH" })).data,

    cancel: async (id: string): Promise<Trip> =>
      (await apiClient.request<ApiEnvelope<Trip>>(`/trips/${id}/cancel`, { method: "PATCH" })).data,

    // --- Substituição pontual do dia (ROT-05/06, tarefa #102) ---

    substituirMotorista: async (id: string, input: SubstituirMotoristaInput): Promise<Trip> =>
      (
        await apiClient.request<ApiEnvelope<Trip>>(`/trips/${id}/substituir-motorista`, {
          method: "PATCH",
          body: input,
        })
      ).data,

    substituirVeiculo: async (id: string, input: SubstituirVeiculoInput): Promise<Trip> =>
      (
        await apiClient.request<ApiEnvelope<Trip>>(`/trips/${id}/substituir-veiculo`, {
          method: "PATCH",
          body: input,
        })
      ).data,

    substituirMonitor: async (id: string, input: SubstituirMonitorInput = {}): Promise<Trip> =>
      (
        await apiClient.request<ApiEnvelope<Trip>>(`/trips/${id}/substituir-monitor`, {
          method: "PATCH",
          body: input,
        })
      ).data,

    listByRoute: async (routeId: string, page = 1, pageSize = 20): Promise<ListTripsResult> =>
      (
        await apiClient.request<ApiEnvelope<ListTripsResult>>(
          `/trips/routes/${routeId}/history${buildQueryString({ page, pageSize })}`,
        )
      ).data,

    ingestPosition: async (id: string, input: IngestPositionInput): Promise<TripPosition> =>
      (
        await apiClient.request<ApiEnvelope<TripPosition>>(`/trips/${id}/positions`, {
          method: "POST",
          body: input,
        })
      ).data,

    ingestPositionsBatch: async (
      id: string,
      posicoes: IngestPositionInput[],
    ): Promise<TripPosition[]> =>
      (
        await apiClient.request<ApiEnvelope<TripPosition[]>>(`/trips/${id}/positions/batch`, {
          method: "POST",
          body: { posicoes },
        })
      ).data,

    listPositions: async (id: string): Promise<TripPosition[]> =>
      (await apiClient.request<ApiEnvelope<TripPosition[]>>(`/trips/${id}/positions`)).data,

    addStudentEvent: async (
      id: string,
      input: CreateTripStudentEventInput,
    ): Promise<TripStudentEvent> =>
      (
        await apiClient.request<ApiEnvelope<TripStudentEvent>>(`/trips/${id}/student-events`, {
          method: "POST",
          body: input,
        })
      ).data,

    listStudentEvents: async (id: string): Promise<TripStudentEvent[]> =>
      (await apiClient.request<ApiEnvelope<TripStudentEvent[]>>(`/trips/${id}/student-events`))
        .data,
  };
}

export type TripsEndpoints = ReturnType<typeof createTripsEndpoints>;
