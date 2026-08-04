import type { ApiClient } from "../http";

/**
 * Endpoints tipados do módulo Auth (Dossiê 15) — espelham exatamente
 * `apps/api/src/modules/auth` (DTOs de request/response). Login único
 * compartilhado por Landing Page/Site/Painel Web/App (briefing: "todas
 * as plataformas compartilharão exatamente a mesma conta").
 */

export type Role =
  "admin_rotta" | "empresa" | "gestor" | "motorista" | "monitor" | "responsavel" | "escola";

export interface MeResponse {
  id: string;
  nome: string;
  email: string;
  telefone: string;
  avatarUrl: string | null;
  role: Role;
  companyId: string | null;
  companyName: string | null;
}

export interface AuthTokensResponse {
  accessToken: string;
  refreshToken: string;
  user: MeResponse;
}

export interface ProfileOption {
  companyId: string;
  companyName: string;
  role: Role;
}

export interface ProfileSelectionResponse {
  requiresProfileSelection: true;
  profiles: ProfileOption[];
}

export type LoginResponse = AuthTokensResponse | ProfileSelectionResponse;

export interface LoginInput {
  identificador: string;
  senha: string;
  companyId?: string;
  deviceName?: string;
}

export interface RegisterEmpresaInput {
  razaoSocial: string;
  nomeFantasia: string;
  cpfCnpj: string;
  tipo: "AUTONOMO" | "MEI" | "LTDA" | "SLU" | "EIRELI" | "OUTRO";
  email: string;
  telefone: string;
  whatsapp?: string;
  cep: string;
  endereco: string;
  numero: string;
  complemento?: string;
  bairro: string;
  cidade: string;
  estado: string;
  aceiteTermos: true;
  administrador: {
    nome: string;
    email: string;
    telefone: string;
    cpf: string;
    senha: string;
  };
}

export interface RegisterPessoalInput {
  nome: string;
  email: string;
  telefone: string;
  cpf: string;
  senha: string;
  aceiteTermos: true;
}

export interface SessionInfo {
  id: string;
  deviceName: string | null;
  ip: string | null;
  createdAt: string;
  lastUsedAt: string;
  isCurrentSession: boolean;
}

export interface InvitePreview {
  companyName: string;
  role: Role;
}

export interface RedeemInviteInput {
  codigo: string;
  nome: string;
  email: string;
  telefone: string;
  cpf: string;
  senha: string;
  aceiteTermos: true;
}

interface ApiEnvelope<T> {
  data: T;
}

export function isProfileSelectionResponse(
  response: LoginResponse,
): response is ProfileSelectionResponse {
  return "requiresProfileSelection" in response;
}

export function createAuthEndpoints(apiClient: ApiClient) {
  return {
    registerEmpresa: async (input: RegisterEmpresaInput): Promise<AuthTokensResponse> =>
      (
        await apiClient.request<ApiEnvelope<AuthTokensResponse>>("/auth/register/empresa", {
          method: "POST",
          body: input,
        })
      ).data,

    registerPessoal: async (input: RegisterPessoalInput): Promise<AuthTokensResponse> =>
      (
        await apiClient.request<ApiEnvelope<AuthTokensResponse>>("/auth/register/pessoal", {
          method: "POST",
          body: input,
        })
      ).data,

    login: async (input: LoginInput): Promise<LoginResponse> =>
      (
        await apiClient.request<ApiEnvelope<LoginResponse>>("/auth/login", {
          method: "POST",
          body: input,
        })
      ).data,

    refresh: async (refreshToken: string): Promise<AuthTokensResponse> =>
      (
        await apiClient.request<ApiEnvelope<AuthTokensResponse>>("/auth/refresh", {
          method: "POST",
          body: { refreshToken },
        })
      ).data,

    logout: async (refreshToken: string): Promise<void> => {
      await apiClient.request("/auth/logout", { method: "POST", body: { refreshToken } });
    },

    me: async (): Promise<MeResponse> =>
      (await apiClient.request<ApiEnvelope<MeResponse>>("/auth/me")).data,

    changePassword: async (senhaAtual: string, novaSenha: string): Promise<{ message: string }> =>
      (
        await apiClient.request<ApiEnvelope<{ message: string }>>("/auth/me/password", {
          method: "PATCH",
          body: { senhaAtual, novaSenha },
        })
      ).data,

    forgotPassword: async (email: string): Promise<{ message: string }> =>
      (
        await apiClient.request<ApiEnvelope<{ message: string }>>("/auth/forgot-password", {
          method: "POST",
          body: { email },
        })
      ).data,

    resetPassword: async (token: string, novaSenha: string): Promise<{ message: string }> =>
      (
        await apiClient.request<ApiEnvelope<{ message: string }>>("/auth/reset-password", {
          method: "POST",
          body: { token, novaSenha },
        })
      ).data,

    listSessions: async (): Promise<SessionInfo[]> =>
      (await apiClient.request<ApiEnvelope<SessionInfo[]>>("/auth/sessions")).data,

    revokeSession: async (sessionId: string): Promise<void> => {
      await apiClient.request(`/auth/sessions/${sessionId}`, { method: "DELETE" });
    },

    revokeOtherSessions: async (): Promise<void> => {
      await apiClient.request("/auth/sessions/other", { method: "DELETE" });
    },

    createInvite: async (
      companyId: string,
      role: Role,
    ): Promise<{ id: string; codigo: string; role: Role; expiresAt: string }> =>
      (
        await apiClient.request<
          ApiEnvelope<{ id: string; codigo: string; role: Role; expiresAt: string }>
        >(`/companies/${companyId}/invites`, { method: "POST", body: { role } })
      ).data,

    listInvites: async (
      companyId: string,
    ): Promise<
      { id: string; codigo: string; role: Role; expiresAt: string; usadoEm: string | null }[]
    > =>
      (
        await apiClient.request<
          ApiEnvelope<
            { id: string; codigo: string; role: Role; expiresAt: string; usadoEm: string | null }[]
          >
        >(`/companies/${companyId}/invites`)
      ).data,

    revokeInvite: async (companyId: string, inviteId: string): Promise<void> => {
      await apiClient.request(`/companies/${companyId}/invites/${inviteId}`, { method: "DELETE" });
    },

    previewInvite: async (codigo: string): Promise<InvitePreview> =>
      (await apiClient.request<ApiEnvelope<InvitePreview>>(`/invites/${codigo}/preview`)).data,

    redeemInvite: async (input: RedeemInviteInput): Promise<AuthTokensResponse> =>
      (
        await apiClient.request<ApiEnvelope<AuthTokensResponse>>("/invites/redeem", {
          method: "POST",
          body: input,
        })
      ).data,
  };
}

export type AuthEndpoints = ReturnType<typeof createAuthEndpoints>;
