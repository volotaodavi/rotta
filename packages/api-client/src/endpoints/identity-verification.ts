import type { ApiClient } from "../http";

/**
 * Endpoints tipados da verificação de identidade hospedada via Didit
 * (Motorista/Empresa-Gestor verificando a PRÓPRIA identidade) — espelham
 * `apps/api/src/modules/identity-verification`. Sempre `/me/*` — não
 * existe rota que aceite um `userId` de outra pessoa.
 */

export type IdentityVerificationStatus =
  "NAO_INICIADA" | "EM_ANDAMENTO" | "EM_ANALISE" | "APROVADA" | "REPROVADA" | "EXPIRADA";

export interface IdentityVerificationStatusResponse {
  status: IdentityVerificationStatus;
  verifiedAt: string | null;
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
  };
}
