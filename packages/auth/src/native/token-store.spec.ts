/**
 * Auditoria minuciosa 04/09/2026 — cobre a lógica de sessão do app
 * mobile (`@rotta/auth`), que nunca teve nenhum teste automatizado.
 * Foco especial em `decodeBase64` (decodificador manual, já que RN não
 * garante `atob` global — bug de encoding aqui quebraria o refresh
 * proativo silenciosamente, sem nenhum erro visível na tela).
 */
import * as SecureStore from "expo-secure-store";

import {
  clearSession,
  decodeJwtExpiryMs,
  getAccessToken,
  getCachedUser,
  getPersistedRefreshToken,
  persistSession,
  setAccessToken,
} from "./token-store";

import type { MeResponse } from "@rotta/api-client";

jest.mock("expo-secure-store", () => {
  const store = new Map<string, string>();
  return {
    getItemAsync: jest.fn(async (key: string) => store.get(key) ?? null),
    setItemAsync: jest.fn(async (key: string, value: string) => {
      store.set(key, value);
    }),
    deleteItemAsync: jest.fn(async (key: string) => {
      store.delete(key);
    }),
    __store: store,
  };
});

const USUARIO: MeResponse = {
  id: "user-1",
  nome: "Maria Teste",
  email: "maria@teste.com",
} as MeResponse;

const BASE64_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

/** Encoder manual (sem `Buffer`/`btoa`) usando o mesmo alfabeto que `decodeBase64` (interno, não exportado) sabe ler — mantém o teste livre de qualquer API de plataforma específica. */
function base64Encode(text: string): string {
  let result = "";
  let buffer = 0;
  let bits = 0;
  for (let i = 0; i < text.length; i += 1) {
    buffer = (buffer << 8) | text.charCodeAt(i);
    bits += 8;
    while (bits >= 6) {
      bits -= 6;
      result += BASE64_CHARS[(buffer >> bits) & 0x3f];
    }
  }
  if (bits > 0) {
    result += BASE64_CHARS[(buffer << (6 - bits)) & 0x3f];
  }
  while (result.length % 4 !== 0) {
    result += "=";
  }
  return result;
}

function fakeJwt(exp: number): string {
  const header = base64Encode(JSON.stringify({ alg: "none" }));
  const payload = base64Encode(JSON.stringify({ exp }));
  return `${header}.${payload}.assinatura-nao-validada`;
}

beforeEach(() => {
  setAccessToken(null);
});

describe("decodeJwtExpiryMs (decodificador base64 manual)", () => {
  it("lê o exp (segundos) e devolve em milissegundos", () => {
    expect(decodeJwtExpiryMs(fakeJwt(1_700_000_000))).toBe(1_700_000_000_000);
  });

  it("lida com padding '=' do base64 (payload com tamanho não múltiplo de 3 bytes)", () => {
    // Um exp com poucos dígitos gera um payload JSON curto o bastante
    // pra frequentemente precisar de padding — cobre a linha
    // `.replace(/=+$/, "")` do decoder manual.
    expect(decodeJwtExpiryMs(fakeJwt(1))).toBe(1_000);
  });

  it("devolve null pra um token sem 3 segmentos", () => {
    expect(decodeJwtExpiryMs("nao-e-um-jwt")).toBeNull();
  });

  it("devolve null pra um payload que não é JSON válido", () => {
    expect(decodeJwtExpiryMs(`header.${base64Encode("{invalido")}.assinatura`)).toBeNull();
  });
});

describe("access token em memória", () => {
  it("começa nulo e reflete o último valor definido", () => {
    expect(getAccessToken()).toBeNull();
    setAccessToken("token-123");
    expect(getAccessToken()).toBe("token-123");
  });
});

describe("persistSession / getCachedUser / getPersistedRefreshToken / clearSession (expo-secure-store)", () => {
  it("persiste e relê o refresh token e o usuário cacheado", async () => {
    await persistSession("refresh-abc", USUARIO);
    expect(await getPersistedRefreshToken()).toBe("refresh-abc");
    expect(await getCachedUser()).toEqual(USUARIO);
  });

  it("clearSession apaga tudo (incluindo o access token em memória) e chama deleteItemAsync", async () => {
    setAccessToken("token-123");
    await persistSession("refresh-abc", USUARIO);
    await clearSession();
    expect(getAccessToken()).toBeNull();
    expect(await getPersistedRefreshToken()).toBeNull();
    expect(await getCachedUser()).toBeNull();
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith("rotta_refresh_token");
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith("rotta_cached_user");
  });

  it("getCachedUser devolve null se o JSON salvo estiver corrompido", async () => {
    await SecureStore.setItemAsync("rotta_cached_user", "{invalido");
    expect(await getCachedUser()).toBeNull();
  });
});

/**
 * INCIDENTE 21/09/2026 — "a conta do transportador não está entrando
 * (nenhuma), fica na tela azul escrito ROTTA".
 *
 * O `SecureStore` do Android descriptografa com uma chave do Keystore
 * do aparelho e LANÇA (não devolve `null`) quando o dado guardado e a
 * chave saem de sincronia: backup restaurado num aparelho novo,
 * biometria/bloqueio de tela cadastrado ou removido, troca de aparelho.
 *
 * Nenhuma destas leituras tinha proteção. O throw subia até
 * `performRefresh`, que deixava o `status` em `"loading"` para sempre —
 * e `RootNavigator` mostra a splash enquanto `status === "loading"`. Sem
 * erro na tela, sem botão, e igual a cada vez que o app abria, porque o
 * dado ilegível continuava lá.
 */
describe("cofre ilegível — nunca pode travar o app", () => {
  const comFalhaDeLeitura = (): void => {
    (SecureStore.getItemAsync as jest.Mock).mockRejectedValueOnce(
      new Error("Could not decrypt the item in SecureStore"),
    );
  };

  it("getPersistedRefreshToken devolve null em vez de lançar", async () => {
    comFalhaDeLeitura();
    await expect(getPersistedRefreshToken()).resolves.toBeNull();
  });

  it("getCachedUser devolve null em vez de lançar", async () => {
    comFalhaDeLeitura();
    await expect(getCachedUser()).resolves.toBeNull();
  });

  it("persistSession devolve false em vez de derrubar um login que deu certo", async () => {
    // O servidor JÁ autenticou. Lançar aqui jogaria fora uma sessão
    // válida por causa do armazenamento local.
    (SecureStore.setItemAsync as jest.Mock).mockRejectedValueOnce(new Error("keystore"));
    await expect(persistSession("refresh-abc", USUARIO)).resolves.toBe(false);
  });

  it("clearSession não lança nem quando apagar falha", async () => {
    // `clearSession` é o caminho de RECUPERAÇÃO de um cofre ilegível —
    // é a última coisa que pode travar.
    (SecureStore.deleteItemAsync as jest.Mock).mockRejectedValueOnce(new Error("keystore"));
    await expect(clearSession()).resolves.toBeUndefined();
    expect(getAccessToken()).toBeNull();
  });
});
