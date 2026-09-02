import { buildQueryString } from "../query.util";

import type { ApiClient } from "../http";

/**
 * Endpoints tipados do módulo Suporte (Dossiê 20, `SUP-01` a `SUP-03` /
 * `ADM-04`; Dossiê 29) — espelham `apps/api/src/modules/support`, mesmo
 * padrão de `endpoints/vehicles.ts`.
 */

export type SupportTicketCategoria = "DUVIDA" | "PROBLEMA_TECNICO" | "COBRANCA" | "OUTRO";
export type SupportTicketStatus = "ABERTO" | "EM_ANDAMENTO" | "ENCERRADO";

export interface SupportTicket {
  id: string;
  companyId: string;
  companyNome: string;
  abertoPorUserId: string;
  abertoPorNome: string;
  abertoPorEmail: string;
  assunto: string;
  descricao: string;
  categoria: SupportTicketCategoria;
  status: SupportTicketStatus;
  anexoUrl: string | null;
  /** Número de protocolo (RT-AAAAMMDD-XXXXXX) — null só em tickets anteriores a essa feature. */
  protocolo: string | null;
  /**
   * Resumo gerado pela IA de suporte — o "documento" do caso. Presente
   * SÓ na resposta pra Admin Rotta (achado em auditoria de segurança
   * 02/09/2026); pra Empresa/Gestor/Responsável a API nem manda esta
   * chave — vem `undefined` aqui, nunca confie num truthy-check com
   * `null` pra decidir se deve mostrar algo.
   */
  resumoIA?: string | null;
  arquivado: boolean;
  arquivadoEm: string | null;
  encerradoEm: string | null;
  encerradoPorNome: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SupportMessage {
  id: string;
  ticketId: string;
  /** Ausente na resposta automática da Rotta AI (`autorIsIA: true`). */
  autorUserId?: string | null;
  autorNome: string;
  autorIsAdminRotta: boolean;
  /** Resposta automática da IA de suporte (Gemini, Frente 5) — nunca um humano. */
  autorIsIA: boolean;
  mensagem: string;
  anexoUrl: string | null;
  createdAt: string;
}

export interface SupportTicketDetail extends SupportTicket {
  mensagens: SupportMessage[];
}

export interface CreateSupportTicketInput {
  assunto: string;
  descricao: string;
  categoria: SupportTicketCategoria;
  anexoUrl?: string;
}

export interface ListSupportTicketsParams {
  status?: SupportTicketStatus;
  categoria?: SupportTicketCategoria;
  /** Só tem efeito para Admin Rotta — Empresa/Gestor sempre veem o próprio tenant. */
  companyId?: string;
  /** false (padrão) esconde arquivados; true mostra só os arquivados. */
  arquivado?: boolean;
  page?: number;
  pageSize?: number;
}

export interface ListSupportTicketsResponse {
  items: SupportTicket[];
  total: number;
  page: number;
  pageSize: number;
}

interface ApiEnvelope<T> {
  data: T;
}

export function createSupportEndpoints(apiClient: ApiClient) {
  return {
    createTicket: async (input: CreateSupportTicketInput): Promise<SupportTicket> =>
      (
        await apiClient.request<ApiEnvelope<SupportTicket>>("/support/tickets", {
          method: "POST",
          body: JSON.stringify(input),
        })
      ).data,

    listTickets: async (
      params: ListSupportTicketsParams = {},
    ): Promise<ListSupportTicketsResponse> =>
      (
        await apiClient.request<ApiEnvelope<ListSupportTicketsResponse>>(
          `/support/tickets${buildQueryString(params)}`,
        )
      ).data,

    getTicketDetail: async (ticketId: string, companyId?: string): Promise<SupportTicketDetail> =>
      (
        await apiClient.request<ApiEnvelope<SupportTicketDetail>>(
          `/support/tickets/${ticketId}${buildQueryString({ companyId })}`,
        )
      ).data,

    addMessage: async (
      ticketId: string,
      mensagem: string,
      companyId?: string,
      anexoUrl?: string,
    ): Promise<SupportMessage> =>
      (
        await apiClient.request<ApiEnvelope<SupportMessage>>(
          `/support/tickets/${ticketId}/messages${buildQueryString({ companyId })}`,
          { method: "POST", body: JSON.stringify({ mensagem, anexoUrl }) },
        )
      ).data,

    closeTicket: async (ticketId: string, companyId?: string): Promise<SupportTicket> =>
      (
        await apiClient.request<ApiEnvelope<SupportTicket>>(
          `/support/tickets/${ticketId}/close${buildQueryString({ companyId })}`,
          { method: "PATCH" },
        )
      ).data,

    archiveTicket: async (ticketId: string, companyId?: string): Promise<SupportTicket> =>
      (
        await apiClient.request<ApiEnvelope<SupportTicket>>(
          `/support/tickets/${ticketId}/archive${buildQueryString({ companyId })}`,
          { method: "PATCH" },
        )
      ).data,

    unarchiveTicket: async (ticketId: string, companyId?: string): Promise<SupportTicket> =>
      (
        await apiClient.request<ApiEnvelope<SupportTicket>>(
          `/support/tickets/${ticketId}/unarchive${buildQueryString({ companyId })}`,
          { method: "PATCH" },
        )
      ).data,
  };
}

export type SupportEndpoints = ReturnType<typeof createSupportEndpoints>;
