import {
  isMfaChallengeResponse,
  isMfaSetupRequiredResponse,
  isProfileSelectionResponse,
} from "@rotta/api-client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

import {
  clearSession,
  decodeJwtExpiryMs,
  getPersistedRefreshToken,
  persistSession,
  setAccessToken,
} from "./token-store";

import type {
  AuthEndpoints,
  AuthTokensResponse,
  LoginInput,
  LoginResponse,
  MeResponse,
  MfaSetupResponse,
  RedeemInviteInput,
  RegisterEmpresaInput,
  RegisterPessoalInput,
} from "@rotta/api-client";

type AuthStatus = "loading" | "authenticated" | "unauthenticated";

interface AuthContextValue {
  status: AuthStatus;
  user: MeResponse | null;
  login: (input: LoginInput) => Promise<LoginResponse>;
  registerEmpresa: (input: RegisterEmpresaInput) => Promise<MeResponse>;
  registerPessoal: (input: RegisterPessoalInput) => Promise<MeResponse>;
  redeemInvite: (input: RedeemInviteInput) => Promise<MeResponse>;
  logout: () => Promise<void>;
  /** MFA obrigatório para Admin Rotta (Dossiê 43) — Admin Rotta não usa o app mobile hoje (`RootNavigator` não tem tela para o papel), mas a interface fica paritária com `../web/auth-context.tsx` para não divergir os dois contratos. */
  mfaSetup: (mfaSetupToken: string) => Promise<MfaSetupResponse>;
  mfaEnable: (
    mfaSetupToken: string,
    code: string,
  ) => Promise<{ user: MeResponse; recoveryCodes: string[] }>;
  mfaVerifyLogin: (
    mfaChallengeToken: string,
    credential: { code: string } | { recoveryCode: string },
  ) => Promise<MeResponse>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const REFRESH_BUFFER_MS = 60_000;

/**
 * Sessão real do módulo Auth no app mobile (Dossiê 15) — mesma conta
 * compartilhada com `apps/web`/`apps/admin` (briefing: "todas as
 * plataformas compartilharão exatamente a mesma conta"). Equivalente a
 * `../web/auth-context.tsx`, adaptado para persistência assíncrona
 * (`expo-secure-store`) em vez de `localStorage`.
 */
export function AuthProvider({
  authApi,
  children,
}: {
  authApi: AuthEndpoints;
  children: ReactNode;
}): JSX.Element {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [user, setUser] = useState<MeResponse | null>(null);
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleProactiveRefresh = useCallback((accessToken: string) => {
    if (refreshTimer.current) {
      clearTimeout(refreshTimer.current);
    }
    const expiryMs = decodeJwtExpiryMs(accessToken);
    if (!expiryMs) {
      return;
    }
    const delay = Math.max(expiryMs - Date.now() - REFRESH_BUFFER_MS, 5_000);
    refreshTimer.current = setTimeout(() => {
      void refreshSession();
    }, delay);
    // refreshSession é definida abaixo neste mesmo componente e só é
    // chamada de dentro do setTimeout (nunca durante esta renderização),
    // então a referência sempre está inicializada quando o timer dispara.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const applySession = useCallback(
    async (tokens: AuthTokensResponse) => {
      setAccessToken(tokens.accessToken);
      await persistSession(tokens.refreshToken, tokens.user);
      setUser(tokens.user);
      setStatus("authenticated");
      scheduleProactiveRefresh(tokens.accessToken);
    },
    [scheduleProactiveRefresh],
  );

  const refreshSession = useCallback(async (): Promise<boolean> => {
    const persistedRefreshToken = await getPersistedRefreshToken();
    if (!persistedRefreshToken) {
      setStatus("unauthenticated");
      return false;
    }
    try {
      const tokens = await authApi.refresh(persistedRefreshToken);
      await applySession(tokens);
      return true;
    } catch {
      await clearSession();
      setUser(null);
      setStatus("unauthenticated");
      return false;
    }
  }, [authApi, applySession]);

  useEffect(() => {
    void refreshSession();
    return () => {
      if (refreshTimer.current) {
        clearTimeout(refreshTimer.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = useCallback(
    async (input: LoginInput): Promise<LoginResponse> => {
      const result = await authApi.login(input);
      // Dossiê 43: `mfaSetupRequired`/`mfaRequired` (Admin Rotta) nunca
      // carregam `accessToken`/`refreshToken` — aplicar sessão nesses
      // ramos gravaria `undefined` como se fosse um token válido.
      if (
        !isProfileSelectionResponse(result) &&
        !isMfaSetupRequiredResponse(result) &&
        !isMfaChallengeResponse(result)
      ) {
        await applySession(result);
      }
      return result;
    },
    [authApi, applySession],
  );

  const mfaSetup = useCallback(
    (mfaSetupToken: string): Promise<MfaSetupResponse> => authApi.mfa.setup(mfaSetupToken),
    [authApi],
  );

  const mfaEnable = useCallback(
    async (
      mfaSetupToken: string,
      code: string,
    ): Promise<{ user: MeResponse; recoveryCodes: string[] }> => {
      const result = await authApi.mfa.enable(mfaSetupToken, code);
      await applySession(result.tokens);
      return { user: result.tokens.user, recoveryCodes: result.recoveryCodes };
    },
    [authApi, applySession],
  );

  const mfaVerifyLogin = useCallback(
    async (
      mfaChallengeToken: string,
      credential: { code: string } | { recoveryCode: string },
    ): Promise<MeResponse> => {
      const tokens = await authApi.mfa.verifyLogin(mfaChallengeToken, credential);
      await applySession(tokens);
      return tokens.user;
    },
    [authApi, applySession],
  );

  const registerEmpresa = useCallback(
    async (input: RegisterEmpresaInput): Promise<MeResponse> => {
      const tokens = await authApi.registerEmpresa(input);
      await applySession(tokens);
      return tokens.user;
    },
    [authApi, applySession],
  );

  const registerPessoal = useCallback(
    async (input: RegisterPessoalInput): Promise<MeResponse> => {
      const tokens = await authApi.registerPessoal(input);
      await applySession(tokens);
      return tokens.user;
    },
    [authApi, applySession],
  );

  const redeemInvite = useCallback(
    async (input: RedeemInviteInput): Promise<MeResponse> => {
      const tokens = await authApi.redeemInvite(input);
      await applySession(tokens);
      return tokens.user;
    },
    [authApi, applySession],
  );

  const logout = useCallback(async (): Promise<void> => {
    const persistedRefreshToken = await getPersistedRefreshToken();
    if (persistedRefreshToken) {
      await authApi.logout(persistedRefreshToken).catch(() => undefined);
    }
    if (refreshTimer.current) {
      clearTimeout(refreshTimer.current);
    }
    await clearSession();
    setUser(null);
    setStatus("unauthenticated");
  }, [authApi]);

  return (
    <AuthContext.Provider
      value={{
        status,
        user,
        login,
        registerEmpresa,
        registerPessoal,
        redeemInvite,
        logout,
        mfaSetup,
        mfaEnable,
        mfaVerifyLogin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth() precisa ser usado dentro de um <AuthProvider>.");
  }
  return context;
}
