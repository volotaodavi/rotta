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
  getAccessToken,
  getPersistedRefreshToken,
  persistSession,
  registerRefreshHandler,
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
  RegisterAutonomoInput,
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
  /** Frente N (briefing item 9) — Motorista/Monitor autônomo, sem empresa ainda. */
  registerAutonomo: (input: RegisterAutonomoInput) => Promise<MeResponse>;
  redeemInvite: (input: RedeemInviteInput) => Promise<MeResponse>;
  logout: () => Promise<void>;
  /** MFA de Admin Rotta (Dossiê 43) — nunca mais exigido no login (pedido do usuário em produção); Admin Rotta também não usa o app mobile (`RootNavigator` não tem tela para o papel), mas a interface fica paritária com `../web/auth-context.tsx` para não divergir os dois contratos. */
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

  /**
   * INCIDENTE 21/09/2026 — "fica na tela azul escrito ROTTA".
   *
   * A leitura do cofre estava FORA do `try`. Quando ela lançava (ver a
   * nota em `token-store.ts` — o `SecureStore` do Android lança de
   * verdade), esta função rejeitava, o `void refreshSession()` lá
   * embaixo engolia a rejeição, e o `status` ficava em `"loading"` para
   * sempre. `RootNavigator` mostra a splash enquanto `status ===
   * "loading"` — então era splash azul permanente, sem erro visível,
   * sem botão, sem saída, e voltava igual a cada vez que o app abria.
   *
   * Agora TUDO está dentro do `try`, e todo caminho de saída define um
   * `status` terminal. É a regra desta função: ela pode falhar, mas não
   * pode terminar sem decidir. Um erro que não sabemos tratar leva à
   * tela de login, que é uma tela de onde a pessoa consegue sair.
   */
  const performRefresh = useCallback(async (): Promise<boolean> => {
    try {
      const persistedRefreshToken = await getPersistedRefreshToken();
      if (!persistedRefreshToken) {
        setStatus("unauthenticated");
        return false;
      }
      const tokens = await authApi.refresh(persistedRefreshToken);
      await applySession(tokens);
      return true;
    } catch {
      await clearSession().catch(() => undefined);
      setUser(null);
      setStatus("unauthenticated");
      return false;
    }
  }, [authApi, applySession]);

  /**
   * Dedupe: sem app com múltiplas abas (é um app só), mas o refresh
   * PROATIVO por timer e um retry REATIVO por 401 (ver `token-store.ts`/
   * `registerRefreshHandler` abaixo) podem disparar ao mesmo tempo — o
   * `refresh_token` é de uso único, então a segunda chamada concorrente
   * reapresentaria um token que a primeira já consumiu e derrubaria a
   * sessão à toa. Toda chamada concorrente recebe a MESMA promise.
   */
  const refreshInFlight = useRef<Promise<boolean> | null>(null);

  const refreshSession = useCallback((): Promise<boolean> => {
    if (refreshInFlight.current) {
      return refreshInFlight.current;
    }
    const promise = performRefresh().finally(() => {
      refreshInFlight.current = null;
    });
    refreshInFlight.current = promise;
    return promise;
  }, [performRefresh]);

  useEffect(() => {
    // Rede de segurança do boot: `performRefresh` já promete definir um
    // `status` terminal sempre, mas esta é a ÚNICA chamada que decide
    // se o app sai da splash na abertura. Se ela rejeitar por um motivo
    // que ninguém previu, o app ainda assim vai parar na tela de login
    // — nunca na splash azul sem saída (incidente de 21/09/2026).
    refreshSession().catch(() => {
      setUser(null);
      setStatus("unauthenticated");
    });
    return () => {
      if (refreshTimer.current) {
        clearTimeout(refreshTimer.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Registra `refreshSession` pra `createApiClient` chamar reativamente
  // a cada 401 (ver comentário grande em `../web/auth-context.tsx` —
  // mesmo BUG REAL de produção "clico e dá erro" em toda ação, aqui
  // fechado do lado mobile também por paridade).
  useEffect(() => {
    registerRefreshHandler(async () => {
      const ok = await refreshSession();
      return ok ? getAccessToken() : null;
    });
    return () => registerRefreshHandler(null);
  }, [refreshSession]);

  const login = useCallback(
    async (input: LoginInput): Promise<LoginResponse> => {
      const result = await authApi.login(input);
      // `mfaSetupRequired`/`mfaRequired` não carregam `accessToken`/
      // `refreshToken` — o backend não emite mais nenhum dos dois pra
      // ninguém (login nunca mais exige MFA), mas o guard continua
      // aqui: aplicar sessão nesses ramos gravaria `undefined` como se
      // fosse um token válido, caso esse contrato volte a existir.
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

  const registerAutonomo = useCallback(
    async (input: RegisterAutonomoInput): Promise<MeResponse> => {
      const tokens = await authApi.registerAutonomo(input);
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
        registerAutonomo,
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
