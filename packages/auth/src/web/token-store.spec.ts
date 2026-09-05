/**
 * @jest-environment jsdom
 *
 * Auditoria minuciosa 04/09/2026 — cobre a lógica de sessão do web
 * (`@rotta/auth`), que nunca teve nenhum teste automatizado apesar de
 * conter a coordenação entre abas que corrigiu o bug real de produção
 * documentado no topo de `token-store.ts` ("qualquer ação dá erro
 * inesperado" — refresh_token de uso único consumido duas vezes por
 * abas concorrentes).
 */
import {
  broadcastAuthEvent,
  clearSession,
  decodeJwtExpiryMs,
  getAccessToken,
  getCachedUser,
  getPersistedRefreshToken,
  persistSession,
  releaseRefreshLock,
  setAccessToken,
  subscribeToAuthBroadcast,
  tryAcquireRefreshLock,
} from "./token-store";

import type { MeResponse } from "@rotta/api-client";

/** `jsdom` não implementa `BroadcastChannel` — stub mínimo, mesma semântica (todo canal com o mesmo nome recebe as mensagens dos outros, nunca a própria). */
class FakeBroadcastChannel {
  private static channels = new Map<string, Set<FakeBroadcastChannel>>();
  private listeners = new Set<(event: { data: unknown }) => void>();

  constructor(private readonly name: string) {
    const set = FakeBroadcastChannel.channels.get(name) ?? new Set();
    set.add(this);
    FakeBroadcastChannel.channels.set(name, set);
  }

  postMessage(data: unknown): void {
    for (const channel of FakeBroadcastChannel.channels.get(this.name) ?? []) {
      if (channel === this) continue;
      for (const listener of channel.listeners) listener({ data });
    }
  }

  addEventListener(_type: "message", listener: (event: { data: unknown }) => void): void {
    this.listeners.add(listener);
  }

  removeEventListener(_type: "message", listener: (event: { data: unknown }) => void): void {
    this.listeners.delete(listener);
  }
}

// @ts-expect-error stub simplificado só com o que este módulo usa
global.BroadcastChannel = FakeBroadcastChannel;

const USUARIO: MeResponse = {
  id: "user-1",
  nome: "Maria Teste",
  email: "maria@teste.com",
} as MeResponse;

/** JWT sintético (assinatura falsa, nunca validada por `decodeJwtExpiryMs` — só o `exp` do payload importa). */
function fakeJwt(exp: number): string {
  const header = btoa(JSON.stringify({ alg: "none" }));
  const payload = btoa(JSON.stringify({ exp }));
  return `${header}.${payload}.assinatura-nao-validada`;
}

beforeEach(() => {
  window.localStorage.clear();
  setAccessToken(null);
});

describe("decodeJwtExpiryMs", () => {
  it("lê o exp (segundos) e devolve em milissegundos", () => {
    expect(decodeJwtExpiryMs(fakeJwt(1_700_000_000))).toBe(1_700_000_000_000);
  });

  it("devolve null pra um token sem 3 segmentos", () => {
    expect(decodeJwtExpiryMs("nao-e-um-jwt")).toBeNull();
  });

  it("devolve null pra um payload que não é JSON válido", () => {
    expect(decodeJwtExpiryMs(`header.${btoa("{invalido")}.assinatura`)).toBeNull();
  });

  it("devolve null quando o payload não tem exp numérico", () => {
    const semExp = `header.${btoa(JSON.stringify({ sub: "x" }))}.assinatura`;
    expect(decodeJwtExpiryMs(semExp)).toBeNull();
  });
});

describe("access token em memória", () => {
  it("começa nulo e reflete o último valor definido", () => {
    expect(getAccessToken()).toBeNull();
    setAccessToken("token-123");
    expect(getAccessToken()).toBe("token-123");
  });
});

describe("persistSession / getCachedUser / getPersistedRefreshToken / clearSession", () => {
  it("persiste e relê o refresh token e o usuário cacheado", () => {
    persistSession("refresh-abc", USUARIO);
    expect(getPersistedRefreshToken()).toBe("refresh-abc");
    expect(getCachedUser()).toEqual(USUARIO);
  });

  it("clearSession apaga tudo (incluindo o access token em memória)", () => {
    setAccessToken("token-123");
    persistSession("refresh-abc", USUARIO);
    clearSession();
    expect(getAccessToken()).toBeNull();
    expect(getPersistedRefreshToken()).toBeNull();
    expect(getCachedUser()).toBeNull();
  });

  it("getCachedUser devolve null se o JSON salvo estiver corrompido", () => {
    window.localStorage.setItem("rotta_cached_user", "{invalido");
    expect(getCachedUser()).toBeNull();
  });
});

describe("tryAcquireRefreshLock / releaseRefreshLock", () => {
  it("a primeira chamada adquire o lock; uma segunda, sem soltar, é bloqueada", () => {
    expect(tryAcquireRefreshLock()).toBe(true);
    expect(tryAcquireRefreshLock()).toBe(false);
  });

  it("depois de releaseRefreshLock, uma nova chamada adquire de novo", () => {
    expect(tryAcquireRefreshLock()).toBe(true);
    releaseRefreshLock();
    expect(tryAcquireRefreshLock()).toBe(true);
  });

  it("expira sozinho depois do TTL (aba líder que travou não bloqueia as outras pra sempre)", () => {
    const agora = 1_000_000;
    jest.spyOn(Date, "now").mockReturnValue(agora);
    expect(tryAcquireRefreshLock()).toBe(true);

    jest.spyOn(Date, "now").mockReturnValue(agora + 8_000 + 1);
    expect(tryAcquireRefreshLock()).toBe(true);

    jest.restoreAllMocks();
  });
});

describe("broadcastAuthEvent / subscribeToAuthBroadcast", () => {
  it("uma aba recebe o evento que a outra transmitiu, nunca o seu próprio", () => {
    const recebidosPorA: unknown[] = [];
    const unsubscribe = subscribeToAuthBroadcast((msg) => recebidosPorA.push(msg));

    broadcastAuthEvent({ type: "session-refreshed", accessToken: "novo-token" });

    // A própria aba que transmitiu não deve se auto-notificar (mesmo
    // canal `BroadcastChannel` real do browser nunca entrega ao emissor).
    expect(recebidosPorA).toEqual([]);

    unsubscribe();
  });

  it("uma segunda aba assinante recebe a mensagem transmitida pela primeira", () => {
    const recebidos: unknown[] = [];
    const unsubscribeOutraAba = subscribeToAuthBroadcast((msg) => recebidos.push(msg));

    // Simula uma aba diferente transmitindo (canal próprio, mesmo nome).
    const canalDaOutraAba = new FakeBroadcastChannel("rotta-auth-session");
    canalDaOutraAba.postMessage({ type: "logged-out" });

    expect(recebidos).toEqual([{ type: "logged-out" }]);
    unsubscribeOutraAba();
  });
});
