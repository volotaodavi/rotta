import type { MeResponse } from "@rotta/api-client";

const REFRESH_STORAGE_KEY = "rotta_refresh_token";
const USER_STORAGE_KEY = "rotta_cached_user";

/**
 * Estado de sessão do lado Web (Dossiê 12, Seção 4.6): `access_token`
 * vive SOMENTE em memória do processo (nunca `localStorage`, vulnerável
 * a XSS) — perdido a cada reload de página, propositalmente, e
 * reobtido via `refresh_token` no boot do `AuthProvider`. O
 * `refresh_token` persiste em `localStorage` nesta fase; a migração
 * para cookie `httpOnly` (isolado até de JS malicioso) é o próximo
 * incremento de segurança documentado, pendente do backend passar a
 * responder via `Set-Cookie` em vez do corpo JSON.
 */
let inMemoryAccessToken: string | null = null;

export function getAccessToken(): string | null {
  return inMemoryAccessToken;
}

export function setAccessToken(token: string | null): void {
  inMemoryAccessToken = token;
}

export function getPersistedRefreshToken(): string | null {
  if (typeof window === "undefined") {
    return null;
  }
  return window.localStorage.getItem(REFRESH_STORAGE_KEY);
}

export function getCachedUser(): MeResponse | null {
  if (typeof window === "undefined") {
    return null;
  }
  const raw = window.localStorage.getItem(USER_STORAGE_KEY);
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as MeResponse;
  } catch {
    return null;
  }
}

export function persistSession(refreshToken: string, user: MeResponse): void {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(REFRESH_STORAGE_KEY, refreshToken);
  window.localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
}

export function clearSession(): void {
  inMemoryAccessToken = null;
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.removeItem(REFRESH_STORAGE_KEY);
  window.localStorage.removeItem(USER_STORAGE_KEY);
}

/** Lê o `exp` (segundos desde epoch) de um JWT sem validar assinatura — só para agendar o refresh proativo. */
export function decodeJwtExpiryMs(token: string): number | null {
  try {
    const [, payloadSegment] = token.split(".");
    if (!payloadSegment) {
      return null;
    }
    const base64 = payloadSegment.replace(/-/g, "+").replace(/_/g, "/");
    const json = atob(base64);
    const payload = JSON.parse(json) as { exp?: number };
    return typeof payload.exp === "number" ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
}

/**
 * Coordenação entre abas pro refresh de sessão — BUG REAL encontrado em
 * produção (usuário: "qualquer ação dá erro inesperado" em Rotas e
 * Veículos): o refresh_token é rotativo e de uso único (backend,
 * `AuthService.refresh` — Dossiê 12 §4.4); reapresentar um já usado é
 * tratado como possível roubo e **revoga TODAS as sessões do usuário**.
 * Com duas abas do painel abertas, cada uma tinha seu próprio timer de
 * refresh proativo lendo o MESMO refresh_token do `localStorage`: a aba
 * que chegasse um instante depois usava o token que a primeira já tinha
 * consumido, disparando a revogação total — dali em diante, toda ação
 * (criar rota, cadastrar veículo, o que fosse) voltava 401 pra sempre,
 * até um novo login manual.
 *
 * `BroadcastChannel` (suportado em todo navegador atual — Chrome/Edge/
 * Firefox sempre, Safari 15.4+) deixa a aba que efetivamente chamou
 * `/auth/refresh` avisar as outras do novo `access_token` em memória
 * (nunca grava em disco — mesma regra de sempre) para elas adotarem a
 * sessão em vez de tentar renovar de novo com um refresh_token que
 * acabou de ser consumido. O lock em `localStorage` (com TTL — se a aba
 * líder cair no meio do refresh, o lock expira sozinho) é o fallback pra
 * quando `BroadcastChannel` não existe: só permite que uma aba por vez
 * chame `/auth/refresh`.
 */
const AUTH_BROADCAST_CHANNEL_NAME = "rotta-auth-session";
const REFRESH_LOCK_KEY = "rotta_refresh_lock";
const REFRESH_LOCK_TTL_MS = 8_000;

export interface AuthBroadcastMessage {
  type: "session-refreshed" | "logged-out";
  accessToken?: string;
  user?: MeResponse;
}

let broadcastChannel: BroadcastChannel | null | undefined;

function getBroadcastChannel(): BroadcastChannel | null {
  if (typeof window === "undefined" || typeof BroadcastChannel === "undefined") {
    return null;
  }
  if (broadcastChannel === undefined) {
    broadcastChannel = new BroadcastChannel(AUTH_BROADCAST_CHANNEL_NAME);
  }
  return broadcastChannel;
}

/** Avisa as outras abas que esta aba acabou de renovar a sessão (ou de fazer logout) — nunca inclui o refresh_token (só o access_token, em memória, e o usuário). */
export function broadcastAuthEvent(message: AuthBroadcastMessage): void {
  getBroadcastChannel()?.postMessage(message);
}

/** Assina eventos de sessão de OUTRAS abas — retorna a função de limpeza (remove o listener). */
export function subscribeToAuthBroadcast(
  handler: (message: AuthBroadcastMessage) => void,
): () => void {
  const channel = getBroadcastChannel();
  if (!channel) {
    return () => undefined;
  }
  const listener = (event: MessageEvent<AuthBroadcastMessage>): void => handler(event.data);
  channel.addEventListener("message", listener);
  return () => channel.removeEventListener("message", listener);
}

/** Tenta se tornar a única aba chamando `/auth/refresh` agora — `false` significa que outra aba já está no meio de um refresh (lock ainda dentro do TTL). */
export function tryAcquireRefreshLock(): boolean {
  if (typeof window === "undefined") {
    return true;
  }
  const now = Date.now();
  const held = Number(window.localStorage.getItem(REFRESH_LOCK_KEY) ?? "");
  if (!Number.isNaN(held) && now - held < REFRESH_LOCK_TTL_MS) {
    return false;
  }
  window.localStorage.setItem(REFRESH_LOCK_KEY, String(now));
  return true;
}

export function releaseRefreshLock(): void {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.removeItem(REFRESH_LOCK_KEY);
}

/** Espera, por até `REFRESH_LOCK_TTL_MS`, uma mensagem de sessão de outra aba (a que está com o lock agora) — usado só quando `tryAcquireRefreshLock()` já devolveu `false`. */
export function waitForBroadcastSession(): Promise<AuthBroadcastMessage | null> {
  return new Promise((resolve) => {
    const maybeChannel = getBroadcastChannel();
    if (!maybeChannel) {
      resolve(null);
      return;
    }
    const channel: BroadcastChannel = maybeChannel;
    const timer = setTimeout(() => {
      channel.removeEventListener("message", onMessage);
      resolve(null);
    }, REFRESH_LOCK_TTL_MS);
    function onMessage(event: MessageEvent<AuthBroadcastMessage>): void {
      clearTimeout(timer);
      channel.removeEventListener("message", onMessage);
      resolve(event.data);
    }
    channel.addEventListener("message", onMessage);
  });
}
