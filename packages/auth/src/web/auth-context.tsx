"use client";

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
  broadcastAuthEvent,
  clearSession,
  decodeJwtExpiryMs,
  getPersistedRefreshToken,
  persistSession,
  releaseRefreshLock,
  setAccessToken,
  subscribeToAuthBroadcast,
  tryAcquireRefreshLock,
  waitForBroadcastSession,
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
  /** Frente N — Motorista/Monitor autônomo. Painel Web não tem tela pra isso (só o app mobile), mas a interface fica paritária com `../native/auth-context.tsx` mesmo assim. */
  registerAutonomo: (input: RegisterAutonomoInput) => Promise<MeResponse>;
  redeemInvite: (input: RedeemInviteInput) => Promise<MeResponse>;
  logout: () => Promise<void>;
  /** MFA de Admin Rotta (Dossiê 43) — nunca mais exigido no login (pedido do usuário em produção). `mfaSetup`/`mfaEnable` continuam servindo quem QUISER ativar TOTP na própria conta por conta própria; `mfaVerifyLogin` ficou inalcançável (nada mais gera o `mfaChallengeToken` que ele exige). Os três só fariam sentido no meio do fluxo de login, nunca autenticados por si só. */
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

/** Margem antes do `exp` do access_token para disparar o refresh proativo (evita uma requisição de negócio falhar por token expirado durante o uso). */
const REFRESH_BUFFER_MS = 60_000;

/**
 * Sessão real do módulo Auth (Dossiê 15) — substitui a ponte temporária
 * de `localStorage` do módulo de Empresas. Compartilhado por
 * `apps/web`/`apps/admin` (briefing: "todas as plataformas
 * compartilharão exatamente a mesma conta") — cada app injeta seu
 * próprio `authApi` (mesma instância de `ApiClient` usada pelos demais
 * endpoints daquele app), nunca constrói um cliente HTTP separado aqui.
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
    (tokens: AuthTokensResponse, options: { broadcast?: boolean } = {}) => {
      setAccessToken(tokens.accessToken);
      persistSession(tokens.refreshToken, tokens.user);
      setUser(tokens.user);
      setStatus("authenticated");
      scheduleProactiveRefresh(tokens.accessToken);
      // Avisa outras abas (mesmo navegador) que já existe uma sessão
      // renovada, pra elas nunca precisarem chamar `/auth/refresh` com
      // um refresh_token que esta aba já consumiu (ver comentário grande
      // em `token-store.ts`) — `broadcast: false` só quando QUEM está
      // aplicando a sessão é o handler que RECEBEU esse mesmo broadcast
      // (evita eco infinito entre abas).
      if (options.broadcast !== false) {
        broadcastAuthEvent({
          type: "session-refreshed",
          accessToken: tokens.accessToken,
          user: tokens.user,
        });
      }
    },
    [scheduleProactiveRefresh],
  );

  /**
   * Dedupe DENTRO da mesma aba — necessário além do lock entre abas
   * (abaixo): `BroadcastChannel` nunca entrega uma mensagem pra quem a
   * postou (só pra OUTRAS abas), então se o timer proativo e um retry
   * reativo por 401 chamassem `refreshSession()` ao mesmo tempo NESTA
   * aba, o segundo nunca veria a mensagem do primeiro e chamaria
   * `/auth/refresh` de novo com o token que o primeiro já consumiu —
   * exatamente o mesmo bug, só que numa corrida intra-aba em vez de
   * entre abas. Toda chamada concorrente enquanto uma já está em
   * andamento recebe a MESMA promise, nunca dispara uma segunda.
   */
  const refreshInFlight = useRef<Promise<boolean> | null>(null);

  /**
   * BUG real de produção corrigido aqui (usuário: "qualquer ação dá erro
   * inesperado" em Rotas/Veículos) — ver o comentário completo em
   * `token-store.ts`: refresh_token é de uso único, então duas abas
   * competindo pelo MESMO refresh_token faziam o backend revogar TODAS
   * as sessões. Antes de chamar `/auth/refresh` com o token persistido,
   * tenta o lock entre abas; se outra aba já está no meio de um refresh
   * agora, espera a mensagem de sessão dela em vez de arriscar reusar um
   * token que ela pode estar consumindo neste exato instante.
   */
  const performRefresh = useCallback(async (): Promise<boolean> => {
    const persistedRefreshToken = getPersistedRefreshToken();
    if (!persistedRefreshToken) {
      setStatus("unauthenticated");
      return false;
    }

    if (!tryAcquireRefreshLock()) {
      const message = await waitForBroadcastSession();
      const refreshTokenAfterBroadcast = getPersistedRefreshToken();
      if (
        message?.type === "session-refreshed" &&
        message.accessToken &&
        message.user &&
        refreshTokenAfterBroadcast
      ) {
        applySession(
          {
            accessToken: message.accessToken,
            refreshToken: refreshTokenAfterBroadcast,
            user: message.user,
          },
          { broadcast: false },
        );
        return true;
      }
      if (message?.type === "logged-out") {
        clearSession();
        setUser(null);
        setStatus("unauthenticated");
        return false;
      }
      // A aba líder não respondeu a tempo (ex.: caiu no meio do refresh)
      // — o lock já expirou pelo TTL. Reafirma o lock com o NOSSO
      // timestamp antes de seguir como líder (senão uma terceira aba
      // checando agora ainda veria o timestamp velho da aba anterior).
      tryAcquireRefreshLock();
    }

    try {
      const tokens = await authApi.refresh(persistedRefreshToken);
      applySession(tokens);
      return true;
    } catch {
      clearSession();
      setUser(null);
      setStatus("unauthenticated");
      broadcastAuthEvent({ type: "logged-out" });
      return false;
    } finally {
      releaseRefreshLock();
    }
  }, [authApi, applySession]);

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
    void refreshSession();
    const unsubscribe = subscribeToAuthBroadcast((message) => {
      if (message.type === "session-refreshed" && message.accessToken && message.user) {
        const refreshToken = getPersistedRefreshToken();
        if (refreshToken) {
          applySession(
            { accessToken: message.accessToken, refreshToken, user: message.user },
            { broadcast: false },
          );
        }
      } else if (message.type === "logged-out") {
        clearSession();
        setUser(null);
        setStatus("unauthenticated");
      }
    });
    return () => {
      unsubscribe();
      if (refreshTimer.current) {
        clearTimeout(refreshTimer.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
        applySession(result);
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
      applySession(result.tokens);
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
      applySession(tokens);
      return tokens.user;
    },
    [authApi, applySession],
  );

  const registerEmpresa = useCallback(
    async (input: RegisterEmpresaInput): Promise<MeResponse> => {
      const tokens = await authApi.registerEmpresa(input);
      applySession(tokens);
      return tokens.user;
    },
    [authApi, applySession],
  );

  const registerPessoal = useCallback(
    async (input: RegisterPessoalInput): Promise<MeResponse> => {
      const tokens = await authApi.registerPessoal(input);
      applySession(tokens);
      return tokens.user;
    },
    [authApi, applySession],
  );

  const registerAutonomo = useCallback(
    async (input: RegisterAutonomoInput): Promise<MeResponse> => {
      const tokens = await authApi.registerAutonomo(input);
      applySession(tokens);
      return tokens.user;
    },
    [authApi, applySession],
  );

  const redeemInvite = useCallback(
    async (input: RedeemInviteInput): Promise<MeResponse> => {
      const tokens = await authApi.redeemInvite(input);
      applySession(tokens);
      return tokens.user;
    },
    [authApi, applySession],
  );

  const logout = useCallback(async (): Promise<void> => {
    const persistedRefreshToken = getPersistedRefreshToken();
    if (persistedRefreshToken) {
      await authApi.logout(persistedRefreshToken).catch(() => undefined);
    }
    if (refreshTimer.current) {
      clearTimeout(refreshTimer.current);
    }
    clearSession();
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
