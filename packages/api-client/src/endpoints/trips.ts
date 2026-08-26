import { buildQueryString } from "../query.util";

import type { ApiClient } from "../http";

/**
 * Endpoints tipados do módulo Trips (GPS-01/02/03/06 + EMB-01/05 +
 * DESEMB-01/03) — espelham exatamente `apps/api/src/modules/trips`
 * (DTOs de request/response). O mapa/localizador em si (agregado) vive
 * em `endpoints/gps.ts`.
 */

export type TripStatus = "EM_ANDAMENTO" | "PAUSADA" | "FINALIZADA" | "CANCELADA";
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
  /** Código único legível da viagem (pedido do usuário: "o código da viagem - único") — gerado uma vez ao iniciar. */
  codigo: string;
  veiculoId: string;
  motoristaId: string;
  monitorId: string | null;
  iniciadaEm: string;
  pausadaEm: string | null;
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

/**
 * Opções rápidas pro formulário de ausência (pedido do usuário: "motivo
 * com opções ou comentário, ambos opcionais") — só sugestões de texto
 * pra tocar uma vez em vez de digitar; `motivoAusencia` continua sendo
 * um texto livre no backend (nunca um enum), então uma opção daqui e um
 * comentário livre digitado são a mesma coisa pro servidor. Compartilhado
 * entre web e mobile pra nunca divergir a lista.
 */
export const MOTIVO_AUSENCIA_PRESETS = [
  "Não estava no ponto",
  "Aluno doente",
  "Responsável avisou a falta",
  "Não vai à escola hoje",
] as const;

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

/** Presença de um aluno hoje (fluxo novo de Rotas — "ao reiniciar a rota"). */
export interface StudentAttendanceToday {
  studentId: string;
  ausenteHoje: boolean;
}

/**
 * Item 3 do pedido do usuário: "reconhecer o endereço alternativo do
 * responsável dentro do raio de embarque/desembarque" — coordenada
 * EFETIVA de um aluno ainda pendente hoje (já resolve
 * `StudentAddressOverride` do lado do backend). Um aluno sem desvio
 * ativo hoje ainda aparece aqui — só que com a coordenada da própria
 * `RouteStop` física.
 */
export interface StudentPendingLocation {
  studentId: string;
  tipo: "EMBARQUE" | "DESEMBARQUE";
  routeStopId: string;
  latitude: number;
  longitude: number;
  endereco: string;
}

/** Parada ainda pendente hoje, com ETA recalculado (tarefa #99). */
export interface NextEta {
  routeStopId: string;
  endereco: string;
  horarioPrevisto: string;
  distanciaMetros: number;
  etaSegundos: number;
  etaPrevista: string;
  /** Coordenada real do waypoint (pode ser um desvio de endereço do dia) — alimenta a linha azul traçada no mapa. */
  latitude: number;
  longitude: number;
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

    /** Prompt Mestre da Rotta, Seção 8 — pausa sem encerrar a viagem (nunca reinicia `iniciadaEm`). */
    pause: async (id: string): Promise<Trip> =>
      (await apiClient.request<ApiEnvelope<Trip>>(`/trips/${id}/pause`, { method: "PATCH" })).data,

    resume: async (id: string): Promise<Trip> =>
      (await apiClient.request<ApiEnvelope<Trip>>(`/trips/${id}/resume`, { method: "PATCH" })).data,

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

    /** Viagem de hoje desta rota (qualquer status), ou `null` — usado pelo app do Motorista para decidir entre "Iniciar viagem" e retomar o acompanhamento de uma já criada. */
    findTodayByRoute: async (routeId: string): Promise<Trip | null> =>
      (await apiClient.request<ApiEnvelope<Trip | null>>(`/trips/routes/${routeId}/today`)).data,

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

    /**
     * Item 3 do pedido do usuário: "reconhecer o endereço alternativo
     * do responsável dentro do raio de embarque/desembarque" —
     * coordenada efetiva de cada aluno ainda pendente hoje.
     */
    listStudentLocations: async (id: string): Promise<StudentPendingLocation[]> =>
      (
        await apiClient.request<ApiEnvelope<StudentPendingLocation[]>>(
          `/trips/${id}/student-locations`,
        )
      ).data,

    // --- Recálculo de ETA por ausência de aluno (tarefa #99) ---

    getProximasEtas: async (id: string): Promise<NextEta[]> =>
      (await apiClient.request<ApiEnvelope<NextEta[]>>(`/trips/${id}/proximas-etas`)).data,

    /**
     * Presença de hoje pra um lote de alunos (fluxo novo de Rotas — "ao
     * reiniciar a rota" pra pegar os alunos NA escola, quem faltou de
     * manhã não deve aparecer como pendente de embarque). `studentIds`
     * vazio nunca é chamado por quem consome isto (ver
     * `features/routes` no apps/web) — nenhuma validação extra aqui,
     * o backend já rejeita um array vazio.
     */
    getAttendanceToday: async (studentIds: string[]): Promise<StudentAttendanceToday[]> =>
      (
        await apiClient.request<ApiEnvelope<StudentAttendanceToday[]>>(
          `/trips/students-attendance-today${buildQueryString({ studentIds: studentIds.join(",") })}`,
        )
      ).data,
  };
}

export type TripsEndpoints = ReturnType<typeof createTripsEndpoints>;
