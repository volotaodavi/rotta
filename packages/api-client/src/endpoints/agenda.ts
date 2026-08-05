import { buildQueryString } from "../query.util";

import type { ApiClient } from "../http";

/**
 * Endpoints tipados do módulo Agenda (Dossiê 8 §14 / EF Parte 6, tarefa
 * #101) — espelham exatamente `apps/api/src/modules/agenda`.
 */

export type AgendaEventoTipo =
  | "FERIADO"
  | "RECESSO"
  | "EVENTO_ESCOLAR"
  | "TROCA_DE_ROTA_PONTUAL"
  | "AUSENCIA_PLANEJADA"
  | "MANUTENCAO_VEICULO"
  | "VENCIMENTO_CNH"
  | "VENCIMENTO_SEGURO"
  | "VENCIMENTO_DOCUMENTO_GENERICO";

export interface CreateAgendaEventInput {
  tipo: AgendaEventoTipo;
  data: string;
  dataFim?: string;
  titulo: string;
  descricao?: string;
  entidadeId?: string;
  entidadeTipo?: string;
}

export type UpdateAgendaEventInput = Partial<
  Pick<CreateAgendaEventInput, "data" | "dataFim" | "titulo" | "descricao">
>;

export interface AgendaEvent {
  id: string;
  companyId: string;
  tipo: AgendaEventoTipo;
  data: string;
  dataFim: string | null;
  titulo: string;
  descricao: string | null;
  entidadeTipo: string | null;
  entidadeId: string | null;
  geradoAutomaticamente: boolean;
  criadoPorId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ListAgendaEventsParams {
  tipo?: AgendaEventoTipo;
  de?: string;
  ate?: string;
  page?: number;
  pageSize?: number;
}

export interface ListAgendaEventsResult {
  items: AgendaEvent[];
  total: number;
  page: number;
  pageSize: number;
}

interface ApiEnvelope<T> {
  data: T;
}

export function createAgendaEndpoints(apiClient: ApiClient) {
  return {
    create: async (input: CreateAgendaEventInput): Promise<AgendaEvent> =>
      (
        await apiClient.request<ApiEnvelope<AgendaEvent>>("/agenda", {
          method: "POST",
          body: input,
        })
      ).data,

    list: async (params: ListAgendaEventsParams = {}): Promise<ListAgendaEventsResult> =>
      (
        await apiClient.request<ApiEnvelope<ListAgendaEventsResult>>(
          `/agenda${buildQueryString(params)}`,
        )
      ).data,

    getById: async (id: string): Promise<AgendaEvent> =>
      (await apiClient.request<ApiEnvelope<AgendaEvent>>(`/agenda/${id}`)).data,

    update: async (id: string, input: UpdateAgendaEventInput): Promise<AgendaEvent> =>
      (
        await apiClient.request<ApiEnvelope<AgendaEvent>>(`/agenda/${id}`, {
          method: "PATCH",
          body: input,
        })
      ).data,

    remove: async (id: string): Promise<void> => {
      await apiClient.request(`/agenda/${id}`, { method: "DELETE" });
    },
  };
}

export type AgendaEndpoints = ReturnType<typeof createAgendaEndpoints>;
