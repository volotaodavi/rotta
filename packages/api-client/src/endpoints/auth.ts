import type { CompanyType } from "./companies";
import type { ApiClient } from "../http";

/**
 * Endpoints tipados do módulo Auth (Dossiê 15) — espelham exatamente
 * `apps/api/src/modules/auth` (DTOs de request/response). Login único
 * compartilhado por Landing Page/Site/Painel Web/App (briefing: "todas
 * as plataformas compartilharão exatamente a mesma conta").
 */

export type Role =
  "admin_rotta" | "empresa" | "gestor" | "motorista" | "monitor" | "responsavel" | "escola";

/** Dossiê 45 FRENTE 5 — consentimento versionado (Termos de Uso / Política de Privacidade). */
export type ConsentType = "TERMOS_DE_USO" | "POLITICA_PRIVACIDADE";

/**
 * Sub-papel dentro de role "admin_rotta" (pedido do usuário 03/09/2026:
 * "crie outros acessos para o painel do admin, porém com
 * particularidades") — GERAL: tudo. SUPORTE: só Suporte/Identidade/
 * Veículos. FINANCEIRO: só as áreas financeiras, sempre leitura.
 */
export type AdminRottaPapel = "GERAL" | "SUPORTE" | "FINANCEIRO";

export interface MeResponse {
  id: string;
  nome: string;
  email: string;
  telefone: string;
  avatarUrl: string | null;
  role: Role;
  companyId: string | null;
  companyName: string | null;
  /** Forma societária da empresa vinculada — null para admin_rotta/responsavel ou motorista/monitor autônomo ainda sem vínculo. Frente G: decide se mostra o alternador Visão completa/Modo Ação (só role "empresa" com AUTONOMO/MEI — dono que também dirige). */
  companyType?: CompanyType | null;
  /** MFA/TOTP ativado (Dossiê 43) — só relevante para role "admin_rotta". */
  mfaEnabled?: boolean;
  /** Faturamento (Dossiê 26) — trial vencido (+1 dia de graça), inadimplente, suspenso ou cancelado. Só relevante para role "empresa"/"gestor" (sempre false pros demais). Front usa isto pro cadeado da navegação (`(dashboard)/layout.tsx`). */
  billingBlocked?: boolean;
  /** Mensagem do motivo do bloqueio (null quando `billingBlocked` é false). */
  billingBlockedReason?: string | null;
  /** Tipos cuja versão vigente o usuário ainda não aceitou (Dossiê 45 FRENTE 5) — vazio quando está tudo em dia. Não-vazio deve disparar um reaceite bloqueante (ver `authApi.acceptConsent`). */
  pendingConsents: ConsentType[];
  /** Sub-papel do Admin Rotta (pedido do usuário 03/09/2026) — só presente pra role "admin_rotta", undefined pra todo outro papel. */
  adminPapel?: AdminRottaPapel;
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

/**
 * `login()` nunca mais devolve isto pra ninguém — pedido do usuário em
 * produção: "desative a verificação de duas etapas para os admins...
 * deixe o login livre, apenas com a senha". O tipo continua declarado
 * (union de `LoginResponse` abaixo) só porque `authEndpoints.mfa.setup`/
 * `mfa.enable` — o fluxo self-service de quem QUISER ativar TOTP na
 * própria conta de Admin Rotta por conta própria, nunca mais exigido
 * no login — ainda usam esse mesmo formato de token de curta duração.
 */
export interface MfaSetupRequiredResponse {
  mfaSetupRequired: true;
  mfaSetupToken: string;
}

/**
 * `login()` nunca mais devolve isto pra ninguém, pelo mesmo motivo do
 * comentário acima — nem pra uma conta com TOTP configurado de antes.
 * `authEndpoints.mfa.verifyLogin` continua existindo, mas ficou
 * inalcançável: nada mais emite o `mfaChallengeToken` que ele exige.
 */
export interface MfaChallengeResponse {
  mfaRequired: true;
  mfaChallengeToken: string;
}

export type LoginResponse =
  AuthTokensResponse | ProfileSelectionResponse | MfaSetupRequiredResponse | MfaChallengeResponse;

export interface MfaSetupResponse {
  secret: string;
  otpauthUrl: string;
  /** PNG como data URL, pronto para `<img src>`. */
  qrCodeDataUrl: string;
}

export interface MfaEnableResponse {
  tokens: AuthTokensResponse;
  /** Só aparecem nesta resposta — nunca mais tarde. Mostrar uma vez, avisar para salvar. */
  recoveryCodes: string[];
}

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
  tipo: CompanyType;
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
  /** Cloudflare Turnstile ("não sou um robô", pedido do usuário 01/09/2026) — só a web preenche; o app nativo não envia (não existe widget lá). */
  turnstileToken?: string;
}

export interface RegisterPessoalInput {
  nome: string;
  email: string;
  telefone: string;
  cpf: string;
  senha: string;
  aceiteTermos: true;
  /** Área pública de convite — reivindica automaticamente esse pré-cadastro (`StudentPreRegistration`) logo após criar a conta. */
  preRegistrationId?: string;
  /** Cloudflare Turnstile ("não sou um robô", pedido do usuário 01/09/2026) — só a web preenche; o app nativo não envia (não existe widget lá). */
  turnstileToken?: string;
}

/** Frente N (briefing item 9) — Motorista/Monitor autônomo, sem empresa ainda. */
export interface RegisterAutonomoInput {
  nome: string;
  email: string;
  telefone: string;
  cpf: string;
  senha: string;
  role: "motorista" | "monitor";
  aceiteTermos: true;
  /**
   * Código da transportadora (Frente 9, auditoria 31/08/2026) — opcional;
   * quando presente, o backend já cria o `CompanyJoinRequest` PENDENTE
   * na mesma chamada, unificando "código → dados → conta" (mesma
   * continuação que o Responsável já tinha via `preRegistrationId`).
   */
  codigoInterno?: string;
  /** Cloudflare Turnstile ("não sou um robô", pedido do usuário 01/09/2026) — só a web preenche; o app nativo não envia (não existe widget lá). */
  turnstileToken?: string;
}

export interface SessionInfo {
  id: string;
  deviceName: string | null;
  ip: string | null;
  createdAt: string;
  lastUsedAt: string;
  isCurrentSession: boolean;
}

/** Autoatendimento LGPD (Dossiê 33) — espelha `DataExportResponseDto`. */
export interface DataExportResponse {
  geradoEm: string;
  usuario: {
    id: string;
    nome: string;
    email: string;
    telefone: string;
    cpf: string;
    avatarUrl: string | null;
    criadoEm: string;
    consentimentoLgpdAceitoEm: string | null;
  };
  vinculos: Array<{
    empresaId: string;
    empresaNome: string;
    papel: string;
    status: string;
    iniciadoEm: string;
    encerradoEm: string | null;
  }>;
  sessoesAtivas: SessionInfo[];
  escopo: string;
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

export function isMfaSetupRequiredResponse(
  response: LoginResponse,
): response is MfaSetupRequiredResponse {
  return "mfaSetupRequired" in response;
}

export function isMfaChallengeResponse(response: LoginResponse): response is MfaChallengeResponse {
  return "mfaRequired" in response;
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

    registerAutonomo: async (input: RegisterAutonomoInput): Promise<AuthTokensResponse> =>
      (
        await apiClient.request<ApiEnvelope<AuthTokensResponse>>("/auth/register/autonomo", {
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

    dataExport: async (): Promise<DataExportResponse> =>
      (await apiClient.request<ApiEnvelope<DataExportResponse>>("/auth/me/data-export")).data,

    /** Reaceite de Termos/Privacidade (Dossiê 45 FRENTE 5) — chamar quando `MeResponse.pendingConsents` vier não-vazio; devolve o perfil já atualizado. */
    acceptConsent: async (tipos: ConsentType[]): Promise<MeResponse> =>
      (
        await apiClient.request<ApiEnvelope<MeResponse>>("/auth/me/consent", {
          method: "POST",
          body: { tipos },
        })
      ).data,

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

    /** MFA obrigatório para Admin Rotta (Dossiê 43) — os 3 primeiros nunca exigem sessão (autenticados só pelo token de curta duração recebido do login). */
    mfa: {
      setup: async (mfaSetupToken: string): Promise<MfaSetupResponse> =>
        (
          await apiClient.request<ApiEnvelope<MfaSetupResponse>>("/auth/mfa/setup", {
            method: "POST",
            body: { mfaSetupToken },
          })
        ).data,

      enable: async (mfaSetupToken: string, code: string): Promise<MfaEnableResponse> =>
        (
          await apiClient.request<ApiEnvelope<MfaEnableResponse>>("/auth/mfa/enable", {
            method: "POST",
            body: { mfaSetupToken, code },
          })
        ).data,

      verifyLogin: async (
        mfaChallengeToken: string,
        credential: { code: string } | { recoveryCode: string },
      ): Promise<AuthTokensResponse> =>
        (
          await apiClient.request<ApiEnvelope<AuthTokensResponse>>("/auth/mfa/verify-login", {
            method: "POST",
            body: { mfaChallengeToken, ...credential },
          })
        ).data,

      /** Requer sessão autenticada — usa o access token já em uso, como qualquer outra rota protegida. */
      disable: async (code: string): Promise<void> => {
        await apiClient.request("/auth/mfa/disable", { method: "POST", body: { code } });
      },
    },
  };
}

export type AuthEndpoints = ReturnType<typeof createAuthEndpoints>;
