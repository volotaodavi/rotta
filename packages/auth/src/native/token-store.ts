import * as SecureStore from "expo-secure-store";

import type { MeResponse } from "@rotta/api-client";

const REFRESH_STORAGE_KEY = "rotta_refresh_token";
const USER_STORAGE_KEY = "rotta_cached_user";

/**
 * Estado de sessão do app mobile (Dossiê 12, Seção 4.6) — `access_token`
 * em memória (perdido ao fechar o app, reobtido via refresh no boot,
 * mesmo princípio da versão Web); `refresh_token` em `expo-secure-store`
 * (Keychain/Keystore nativo — não é `AsyncStorage`, que não é
 * criptografado).
 */
let inMemoryAccessToken: string | null = null;

export function getAccessToken(): string | null {
  return inMemoryAccessToken;
}

export function setAccessToken(token: string | null): void {
  inMemoryAccessToken = token;
}

export async function getPersistedRefreshToken(): Promise<string | null> {
  return SecureStore.getItemAsync(REFRESH_STORAGE_KEY);
}

export async function getCachedUser(): Promise<MeResponse | null> {
  const raw = await SecureStore.getItemAsync(USER_STORAGE_KEY);
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as MeResponse;
  } catch {
    return null;
  }
}

export async function persistSession(refreshToken: string, user: MeResponse): Promise<void> {
  await SecureStore.setItemAsync(REFRESH_STORAGE_KEY, refreshToken);
  await SecureStore.setItemAsync(USER_STORAGE_KEY, JSON.stringify(user));
}

export async function clearSession(): Promise<void> {
  inMemoryAccessToken = null;
  await SecureStore.deleteItemAsync(REFRESH_STORAGE_KEY);
  await SecureStore.deleteItemAsync(USER_STORAGE_KEY);
}

/** Lê o `exp` (segundos desde epoch) de um JWT sem validar assinatura — só para agendar o refresh proativo. */
export function decodeJwtExpiryMs(token: string): number | null {
  try {
    const [, payloadSegment] = token.split(".");
    if (!payloadSegment) {
      return null;
    }
    const base64 = payloadSegment.replace(/-/g, "+").replace(/_/g, "/");
    const json = decodeBase64(base64);
    const payload = JSON.parse(json) as { exp?: number };
    return typeof payload.exp === "number" ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
}

/** RN não tem `atob` global garantido em todo motor JS — decodificação manual de base64. */
function decodeBase64(base64: string): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  let result = "";
  let buffer = 0;
  let bits = 0;
  for (const char of base64.replace(/=+$/, "")) {
    buffer = (buffer << 6) | chars.indexOf(char);
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      result += String.fromCharCode((buffer >> bits) & 0xff);
    }
  }
  return result;
}
