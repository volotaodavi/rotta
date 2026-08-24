import { buildQueryString } from "../query.util";

import type { SchoolShift } from "./schools";
import type { ApiClient } from "../http";

/**
 * Endpoints tipados do módulo Rotas (ROT-01/02/04/07) — espelham
 * exatamente `apps/api/src/modules/routes` (DTOs de request/response).
 * Nenhuma tela chama `apiClient.request` diretamente para uma rota de
 * Rotas — sempre por uma destas funções. `SchoolShift` é reaproveitado
 * de `./schools` (mesmo enum `Route.turno`/`School.turno` no Prisma —
 * ver nota do schema) em vez de redeclarado, para não colidir com o
 * `export *` deste barrel.
 */

export type RouteStatus = "ATIVA" | "PAUSADA";
export type RouteWeekday =
  "SEGUNDA" | "TERCA" | "QUARTA" | "QUINTA" | "SEXTA" | "SABADO" | "DOMINGO";

export interface CreateRouteInput {
  nome: string;
  turno: SchoolShift;
  diasSemana: RouteWeekday[];
  veiculoPadraoId?: string;
  motoristaPadraoId?: string;
  monitorPadraoId?: string;
}

export type UpdateRouteInput = Partial<CreateRouteInput> & { status?: RouteStatus };

export interface Route {
  id: string;
  companyId: string;
  nome: string;
  turno: SchoolShift;
  diasSemana: RouteWeekday[];
  status: RouteStatus;
  veiculoPadraoId: string | null;
  motoristaPadraoId: string | null;
  monitorPadraoId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ListRoutesParams {
  search?: string;
  status?: RouteStatus;
  turno?: SchoolShift;
  /** Somente Admin Rotta: filtra a visão cross-tenant por uma empresa específica. */
  companyId?: string;
  page?: number;
  pageSize?: number;
}

export interface ListRoutesResult {
  items: Route[];
  total: number;
  page: number;
  pageSize: number;
}

/**
 * Duas formas de informar a localização de uma parada (pedido do
 * usuário: "quando for criar uma rota, deverá ser mediante a escola que
 * foi importada, não deverá colocar o endereço de fato") — a API exige
 * uma das duas:
 *  - `schoolId`: parada NA escola, escolhida do catálogo compartilhado
 *    já importado/geocodificado — `endereco`/`latitude`/`longitude` são
 *    preenchidos pelo backend a partir da própria School, nunca
 *    digitados.
 *  - `endereco`+`latitude`+`longitude`: qualquer outro ponto (ex.
 *    residência de um aluno).
 */
export interface CreateRouteStopInput {
  ordem: number;
  schoolId?: string;
  endereco?: string;
  latitude?: number;
  longitude?: number;
  horarioPrevisto: string;
}

export type UpdateRouteStopInput = Partial<CreateRouteStopInput>;

export interface RouteStop {
  id: string;
  routeId: string;
  ordem: number;
  endereco: string;
  latitude: number;
  longitude: number;
  horarioPrevisto: string;
  schoolId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AddRouteStudentInput {
  contractId: string;
  paradaEmbarqueId: string;
  paradaDesembarqueId: string;
}

export interface RouteStudent {
  id: string;
  routeId: string;
  contractId: string;
  studentId: string;
  paradaEmbarqueId: string;
  paradaDesembarqueId: string;
  ativo: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ApiEnvelope<T> {
  data: T;
}

export function createRoutesEndpoints(apiClient: ApiClient) {
  return {
    create: async (input: CreateRouteInput): Promise<Route> =>
      (await apiClient.request<ApiEnvelope<Route>>("/routes", { method: "POST", body: input }))
        .data,

    list: async (params: ListRoutesParams = {}): Promise<ListRoutesResult> =>
      (await apiClient.request<ApiEnvelope<ListRoutesResult>>(`/routes${buildQueryString(params)}`))
        .data,

    getById: async (id: string): Promise<Route> =>
      (await apiClient.request<ApiEnvelope<Route>>(`/routes/${id}`)).data,

    update: async (id: string, input: UpdateRouteInput): Promise<Route> =>
      (
        await apiClient.request<ApiEnvelope<Route>>(`/routes/${id}`, {
          method: "PATCH",
          body: input,
        })
      ).data,

    remove: async (id: string): Promise<void> => {
      await apiClient.request(`/routes/${id}`, { method: "DELETE" });
    },

    addStop: async (id: string, input: CreateRouteStopInput): Promise<RouteStop> =>
      (
        await apiClient.request<ApiEnvelope<RouteStop>>(`/routes/${id}/stops`, {
          method: "POST",
          body: input,
        })
      ).data,

    listStops: async (id: string): Promise<RouteStop[]> =>
      (await apiClient.request<ApiEnvelope<RouteStop[]>>(`/routes/${id}/stops`)).data,

    updateStop: async (
      id: string,
      stopId: string,
      input: UpdateRouteStopInput,
    ): Promise<RouteStop> =>
      (
        await apiClient.request<ApiEnvelope<RouteStop>>(`/routes/${id}/stops/${stopId}`, {
          method: "PATCH",
          body: input,
        })
      ).data,

    removeStop: async (id: string, stopId: string): Promise<void> => {
      await apiClient.request(`/routes/${id}/stops/${stopId}`, { method: "DELETE" });
    },

    /**
     * Aplica de fato a ordem sugerida pela Rotta Route AI
     * (`rottaAiApi.suggestRouteOptimization`) ou qualquer reordenação
     * manual — `stopIds` precisa ser a sequência COMPLETA e final (a
     * rota inteira, não só um trecho); o backend rejeita se faltar ou
     * sobrar algum ID (`RoutesService.reorderStops`).
     */
    reorderStops: async (id: string, stopIds: string[]): Promise<RouteStop[]> =>
      (
        await apiClient.request<ApiEnvelope<RouteStop[]>>(`/routes/${id}/stops/reorder`, {
          method: "PATCH",
          body: { stopIds },
        })
      ).data,

    addStudent: async (id: string, input: AddRouteStudentInput): Promise<RouteStudent> =>
      (
        await apiClient.request<ApiEnvelope<RouteStudent>>(`/routes/${id}/students`, {
          method: "POST",
          body: input,
        })
      ).data,

    listStudents: async (id: string): Promise<RouteStudent[]> =>
      (await apiClient.request<ApiEnvelope<RouteStudent[]>>(`/routes/${id}/students`)).data,

    removeStudent: async (id: string, routeStudentId: string): Promise<void> => {
      await apiClient.request(`/routes/${id}/students/${routeStudentId}`, { method: "DELETE" });
    },
  };
}

export type RoutesEndpoints = ReturnType<typeof createRoutesEndpoints>;
