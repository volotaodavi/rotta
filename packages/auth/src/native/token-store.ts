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

/**
 * Mesma ponte de `../web/token-store.ts` entre `packages/api-client`
 * (sem acesso a React/`AuthProvider`) e o refresh de sessão de verdade
 * — `AuthProvider` registra no mount, `createApiClient({
 * refreshAccessToken })` chama reativamente a cada 401 (ver `http.ts`).
 */
let refreshHandler: (() => Promise<string | null>) | null = null;

export function registerRefreshHandler(handler: (() => Promise<string | null>) | null): void {
  refreshHandler = handler;
}

export async function requestTokenRefresh(): Promise<string | null> {
  return (await refreshHandler?.()) ?? null;
}

/**
 * INCIDENTE 21/09/2026 — o app ficava preso na splash azul.
 *
 * `SecureStore` no Android descriptografa usando uma chave do Keystore
 * do aparelho, e LANÇA (não devolve `null`) quando o dado guardado e a
 * chave saem de sincronia — backup automático restaurado num aparelho
 * novo, biometria/bloqueio de tela cadastrado ou removido, troca de
 * aparelho com o mesmo login. Nenhuma destas leituras tinha proteção:
 * um throw aqui subia até `performRefresh`, que deixava o `status` em
 * `"loading"` para sempre, e `RootNavigator` mostra a splash enquanto
 * `status === "loading"`.
 *
 * O detalhe cruel é que o dado ilegível FICA no aparelho: fechar e
 * reabrir o app repetia o mesmo travamento, sem nenhuma saída.
 *
 * A partir daqui, ler o cofre nunca lança. Falha de leitura vira
 * "não há sessão guardada", que leva à tela de login — pedir a senha de
 * novo é um incômodo; não abrir o app é perder o dia de trabalho.
 */
async function lerDoCofre(chave: string): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(chave);
  } catch {
    return null;
  }
}

export async function getPersistedRefreshToken(): Promise<string | null> {
  return lerDoCofre(REFRESH_STORAGE_KEY);
}

export async function getCachedUser(): Promise<MeResponse | null> {
  const raw = await lerDoCofre(USER_STORAGE_KEY);
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as MeResponse;
  } catch {
    return null;
  }
}

/**
 * Devolve `false` quando não foi possível guardar.
 *
 * Quem chama decide o que fazer: a sessão em memória continua válida
 * nesta execução, só não sobrevive a fechar o app. Lançar aqui
 * derrubaria um login que ACABOU de dar certo no servidor.
 */
export async function persistSession(refreshToken: string, user: MeResponse): Promise<boolean> {
  try {
    await SecureStore.setItemAsync(REFRESH_STORAGE_KEY, refreshToken);
    await SecureStore.setItemAsync(USER_STORAGE_KEY, JSON.stringify(user));
    return true;
  } catch {
    return false;
  }
}

export async function clearSession(): Promise<void> {
  inMemoryAccessToken = null;
  // Apagar é justamente o que conserta um cofre ilegível — mas se nem
  // apagar der, sair daqui sem lançar importa mais: `clearSession` é o
  // caminho de recuperação, e ele não pode ser o que trava.
  await apagarDoCofre(REFRESH_STORAGE_KEY);
  await apagarDoCofre(USER_STORAGE_KEY);
}

async function apagarDoCofre(chave: string): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(chave);
  } catch {
    // Ver nota em `clearSession`.
  }
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
