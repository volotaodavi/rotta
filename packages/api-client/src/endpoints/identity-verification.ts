import { buildQueryString } from "../query.util";

import type { ApiClient } from "../http";

/**
 * Endpoints tipados da verificação de identidade hospedada via Didit —
 * espelham `apps/api/src/modules/identity-verification`. `/me/*` é
 * sempre a PRÓPRIA identidade do ator autenticado (Motorista/Empresa-
 * Gestor); `/admin/*` é exclusivo do Admin Rotta (`Role.ADMIN_ROTTA`) —
 * visão de todos os usuários, sincronização com a Didit e decisão
 * manual (aprovar/recusar) direto do painel Rotta.
 */

export type IdentityVerificationStatus =
  "NAO_INICIADA" | "EM_ANDAMENTO" | "EM_ANALISE" | "APROVADA" | "REPROVADA" | "EXPIRADA";

export interface IdentityVerificationStatusResponse {
  status: IdentityVerificationStatus;
  verifiedAt: string | null;
  /** Motivo legível da última decisão — só populado quando a Didit (ou o Admin Rotta) de fato informou um. É o texto mostrado na tela de bloqueio quando `status === "REPROVADA"`. */
  motivo: string | null;
}

export interface IdentityVerificationSessionResponse {
  /** URL hospedada pela Didit — abrir com `@didit-protocol/sdk-web` (`DiditSdk.shared.startVerification({ url })`) ou como redirect. */
  url: string;
  sessionId: string;
}

export interface CreateIdentityVerificationSessionInput {
  /** Para onde a Didit redireciona ao concluir o fluxo — opcional (ex.: `window.location.href`). */
  callbackUrl?: string;
}

/** Linha de `GET /identity-verification/admin` — um resumo por usuário. */
export interface AdminIdentityVerificationListItem {
  userId: string;
  nome: string;
  email: string;
  companyName: string | null;
  /** Cargo (`Membership.role`) mais recente do usuário — `null` quando não há vínculo ainda. */
  role: string | null;
  /** Documento que o workflow Didit dessa pessoa exige (CNH pra Motorista, qualquer documento pros demais) — nunca decidir aprovar/recusar sem isso. */
  documentoEsperado: string;
  status: IdentityVerificationStatus;
  sessionId: string | null;
  motivo: string | null;
  verifiedAt: string | null;
  updatedAt: string;
}

export interface AdminIdentityVerificationListResult {
  items: AdminIdentityVerificationListItem[];
  total: number;
  page: number;
  pageSize: number;
}

/** Detalhe `GET /identity-verification/admin/:userId` — a linha da listagem mais o payload bruto da última decisão da Didit (auditoria/debug). */
export interface AdminIdentityVerificationDetail extends AdminIdentityVerificationListItem {
  decisao: unknown;
}

export interface ListAdminIdentityVerificationsParams {
  search?: string;
  status?: IdentityVerificationStatus;
  page?: number;
  pageSize?: number;
}

export interface DecideIdentityVerificationInput {
  newStatus: "Approved" | "Declined";
  /** Motivo mostrado direto pro usuário reprovado — obrigatório quando `newStatus` é `"Declined"`. */
  comment?: string;
}

interface ApiEnvelope<T> {
  data: T;
}

export function createIdentityVerificationEndpoints(apiClient: ApiClient) {
  return {
    getMyStatus: async (): Promise<IdentityVerificationStatusResponse> =>
      (
        await apiClient.request<ApiEnvelope<IdentityVerificationStatusResponse>>(
          "/identity-verification/me",
        )
      ).data,

    createMySession: async (
      input: CreateIdentityVerificationSessionInput = {},
    ): Promise<IdentityVerificationSessionResponse> =>
      (
        await apiClient.request<ApiEnvelope<IdentityVerificationSessionResponse>>(
          "/identity-verification/me/sessions",
          { method: "POST", body: input },
        )
      ).data,

    /** Sincroniza (pull) o estado atual direto da Didit, sem depender do webhook ter chegado — corrige o caso de "Em andamento" travado pra sempre. */
    refreshMyStatus: async (): Promise<IdentityVerificationStatusResponse> =>
      (
        await apiClient.request<ApiEnvelope<IdentityVerificationStatusResponse>>(
          "/identity-verification/me/refresh",
          { method: "POST" },
        )
      ).data,

    /** Admin Rotta — todos os usuários que já iniciaram ao menos uma sessão Didit. */
    listAdmin: async (
      params: ListAdminIdentityVerificationsParams = {},
    ): Promise<AdminIdentityVerificationListResult> =>
      (
        await apiClient.request<ApiEnvelope<AdminIdentityVerificationListResult>>(
          `/identity-verification/admin${buildQueryString(params)}`,
        )
      ).data,

    /** Admin Rotta — detalhe de um usuário, com o payload bruto da última decisão. */
    getAdmin: async (userId: string): Promise<AdminIdentityVerificationDetail> =>
      (
        await apiClient.request<ApiEnvelope<AdminIdentityVerificationDetail>>(
          `/identity-verification/admin/${userId}`,
        )
      ).data,

    /** Admin Rotta — sincroniza (pull) o estado atual direto da Didit (`GET /v3/session/{id}/decision/`), pro caso de uma decisão tomada no Business Console dela ainda não ter chegado pelo webhook. */
    refreshAdmin: async (userId: string): Promise<AdminIdentityVerificationDetail> =>
      (
        await apiClient.request<ApiEnvelope<AdminIdentityVerificationDetail>>(
          `/identity-verification/admin/${userId}/refresh`,
          { method: "POST" },
        )
      ).data,

    /** Admin Rotta — aprova/recusa manualmente direto do painel, sem precisar abrir o Business Console da Didit. */
    decideAdmin: async (
      userId: string,
      input: DecideIdentityVerificationInput,
    ): Promise<AdminIdentityVerificationDetail> =>
      (
        await apiClient.request<ApiEnvelope<AdminIdentityVerificationDetail>>(
          `/identity-verification/admin/${userId}/decision`,
          { method: "POST", body: input },
        )
      ).data,
  };
}
