import { isProfileSelectionResponse } from "@rotta/api-client";
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
      if (!isProfileSelectionResponse(result)) {
        await applySession(result);
      }
      return result;
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
      value={{ status, user, login, registerEmpresa, registerPessoal, redeemInvite, logout }}
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
