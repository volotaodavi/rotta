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
