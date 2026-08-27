import { buildQueryString } from "../query.util";

import type { ApiClient } from "../http";

/**
 * Endpoints tipados de avisos de plano (Dossiê 26, painel Admin
 * "Controle de Planos") — espelham
 * `apps/api/src/modules/plan-notices`. Distinto de
 * `endpoints/announcements.ts` (broadcast por PAPEL): aqui o aviso é
 * sobre o PLANO de uma empresa (ou de todas), sempre escrito pelo
 * Admin Rotta.
 */
export interface PlanNotice {
  id: string;
  titulo: string;
  corpo: string;
  companyId: string | null;
  companyNomeFantasia: string | null;
  ativo: boolean;
  criadoPorNome: string;
  createdAt: string;
}

export interface CreatePlanNoticeInput {
  titulo: string;
  corpo: string;
  /** Ausente/`undefined` = aviso GLOBAL (toda empresa enxerga). */
  companyId?: string;
}

export interface ListPlanNoticesParams {
  page?: number;
  pageSize?: number;
  companyId?: string;
}

export interface ListPlanNoticesResponse {
  items: PlanNotice[];
  total: number;
  page: number;
  pageSize: number;
}

interface ApiEnvelope<T> {
  data: T;
}

export function createPlanNoticesEndpoints(apiClient: ApiClient) {
  return {
    create: async (input: CreatePlanNoticeInput): Promise<PlanNotice> =>
      (
        await apiClient.request<ApiEnvelope<PlanNotice>>("/plan-notices", {
          method: "POST",
          body: input,
        })
      ).data,

    list: async (params: ListPlanNoticesParams = {}): Promise<ListPlanNoticesResponse> =>
      (
        await apiClient.request<ApiEnvelope<ListPlanNoticesResponse>>(
          `/plan-notices${buildQueryString(params)}`,
        )
      ).data,

    ativar: async (id: string): Promise<PlanNotice> =>
      (
        await apiClient.request<ApiEnvelope<PlanNotice>>(`/plan-notices/${id}/ativar`, {
          method: "POST",
        })
      ).data,

    desativar: async (id: string): Promise<PlanNotice> =>
      (
        await apiClient.request<ApiEnvelope<PlanNotice>>(`/plan-notices/${id}/desativar`, {
          method: "POST",
        })
      ).data,

    /** Empresa/Gestor — avisos ativos globais + os da própria empresa (ver `GET /billing/notices`). */
    listMine: async (): Promise<PlanNotice[]> =>
      (await apiClient.request<ApiEnvelope<PlanNotice[]>>("/billing/notices")).data,
  };
}

export type PlanNoticesEndpoints = ReturnType<typeof createPlanNoticesEndpoints>;
