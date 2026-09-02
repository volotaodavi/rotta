import type { ApiClient } from "../http";
import type { Role } from "./auth";

/**
 * Endpoints tipados de `company-join-requests` (Frente N, briefing item
 * 9) — espelham exatamente `apps/api/src/modules/company-join-requests`
 * (DTOs de request/response). `create`/`findMine` são do lado do
 * Motorista/Monitor autônomo; `findPending`/`approve`/`reject` são do
 * lado da Empresa/Gestor, em "Equipe".
 */

export type CompanyJoinRequestStatus = "PENDENTE" | "APROVADO" | "RECUSADO";

export interface CompanyJoinRequest {
  id: string;
  companyId: string;
  companyName: string;
  role: Role;
  status: CompanyJoinRequestStatus;
  motivoRecusa: string | null;
  createdAt: string;
  decidedAt: string | null;
  /** `true` quando o vínculo foi aceito na hora por bater com um pré-cadastro em "Convites", sem decisão manual. */
  automatico: boolean;
}

/** Linha de `GET /company-join-requests` (visão da empresa) — inclui quem é o solicitante. */
export interface CompanyJoinRequestListItem extends CompanyJoinRequest {
  userId: string;
  userName: string;
  userEmail: string;
  userTelefone: string;
}

interface ApiEnvelope<T> {
  data: T;
}

export function createCompanyJoinRequestsEndpoints(apiClient: ApiClient) {
  return {
    /** "Informar código da transportadora" — Motorista/Monitor autônomo pede vínculo. */
    create: async (codigoInterno: string): Promise<CompanyJoinRequest> =>
      (
        await apiClient.request<ApiEnvelope<CompanyJoinRequest>>("/company-join-requests", {
          method: "POST",
          body: { codigoInterno },
        })
      ).data,

    /** Tela "Meu pedido" no app — último pedido feito (ou `null` se nunca pediu nenhum). */
    findMine: async (): Promise<CompanyJoinRequest | null> =>
      (await apiClient.request<ApiEnvelope<CompanyJoinRequest | null>>("/company-join-requests/me"))
        .data,

    /** "Equipe" (`apps/web`) — pedidos PENDENTE da própria empresa. */
    findPending: async (): Promise<CompanyJoinRequestListItem[]> =>
      (await apiClient.request<ApiEnvelope<CompanyJoinRequestListItem[]>>("/company-join-requests"))
        .data,

    approve: async (id: string): Promise<CompanyJoinRequestListItem> =>
      (
        await apiClient.request<ApiEnvelope<CompanyJoinRequestListItem>>(
          `/company-join-requests/${id}/approve`,
          { method: "POST" },
        )
      ).data,

    reject: async (id: string, motivo?: string): Promise<CompanyJoinRequestListItem> =>
      (
        await apiClient.request<ApiEnvelope<CompanyJoinRequestListItem>>(
          `/company-join-requests/${id}/reject`,
          { method: "POST", body: { motivo } },
        )
      ).data,
  };
}
