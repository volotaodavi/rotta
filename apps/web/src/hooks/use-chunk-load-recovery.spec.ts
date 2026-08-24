import { renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useChunkLoadRecovery } from "./use-chunk-load-recovery";

const GUARD_KEY = "rotta_chunk_reload_state";

function chunkLoadError(message = "Loading chunk 8039 failed."): Error {
  const error = new Error(message);
  error.name = "ChunkLoadError";
  return error;
}

function setGuardState(attempts: number, lastAttemptAt: number): void {
  sessionStorage.setItem(GUARD_KEY, JSON.stringify({ attempts, lastAttemptAt }));
}

describe("useChunkLoadRecovery", () => {
  let reloadSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    sessionStorage.clear();
    reloadSpy = vi.fn();
    // jsdom não implementa navegação real — substitui só o método usado.
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { ...window.location, reload: reloadSpy },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("recarrega a página (após o atraso deliberado) na primeira ocorrência de um ChunkLoadError real", () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useChunkLoadRecovery(chunkLoadError()));

    // Atraso deliberado antes do reload de verdade (ver `RELOAD_DELAY_MS`)
    // — `isRecovering` já fica `true` na hora, o reload em si só depois.
    expect(reloadSpy).not.toHaveBeenCalled();
    expect(result.current).toBe(true);
    expect(sessionStorage.getItem(GUARD_KEY)).not.toBeNull();

    vi.runAllTimers();
    expect(reloadSpy).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });

  it("NÃO recarrega para um erro de aplicação normal (não é ChunkLoadError)", () => {
    const { result } = renderHook(() =>
      useChunkLoadRecovery(new Error("Não foi possível carregar os alunos da rota.")),
    );

    expect(reloadSpy).not.toHaveBeenCalled();
    expect(result.current).toBe(false);
  });

  /**
   * A defesa estrutural contra este padrão passou a ser `deploymentId`
   * (`next.config.mjs`) — este hook é só o último recurso, com no máximo
   * `MAX_RELOAD_ATTEMPTS` (1) tentativa por episódio. Uma ocorrência real
   * já provou que mais tentativas automáticas (2 e depois 3) não
   * resolveram uma falha persistente — só adiaram a mesma tela de erro,
   * escondendo o incidente atrás de recargas piscando. Ver a nota grande
   * em `use-chunk-load-recovery.ts`.
   */
  it("desiste depois de MAX_RELOAD_ATTEMPTS (1) tentativa no mesmo episódio", () => {
    setGuardState(1, Date.now() - 2_000);

    const { result } = renderHook(() => useChunkLoadRecovery(chunkLoadError()));

    expect(reloadSpy).not.toHaveBeenCalled();
    expect(result.current).toBe(false);
  });

  it("começa um episódio novo (zera a contagem) depois que a janela de 15s expira", () => {
    setGuardState(1, Date.now() - 16_000);
    vi.useFakeTimers();

    const { result } = renderHook(() => useChunkLoadRecovery(chunkLoadError()));
    vi.runAllTimers();

    expect(reloadSpy).toHaveBeenCalledTimes(1);
    expect(result.current).toBe(true);
    expect(JSON.parse(sessionStorage.getItem(GUARD_KEY) ?? "{}").attempts).toBe(1);
    vi.useRealTimers();
  });

  it("recarrega diante da mensagem genérica de 'Server Components render' sem digest (caso real de produção)", () => {
    vi.useFakeTimers();
    const error = new Error(
      "An error occurred in the Server Components render. The specific message is omitted in production builds to avoid leaking sensitive details. A digest property is included on this error instance which may provide additional details about the nature of the error.",
    );

    const { result } = renderHook(() => useChunkLoadRecovery(error));
    vi.runAllTimers();

    expect(reloadSpy).toHaveBeenCalledTimes(1);
    expect(result.current).toBe(true);
    vi.useRealTimers();
  });

  it("NÃO recarrega a mesma mensagem genérica quando vem com um digest real (erro de app de verdade, não bundle obsoleto/version skew)", () => {
    const error = new Error(
      "An error occurred in the Server Components render. The specific message is omitted in production builds to avoid leaking sensitive details. A digest property is included on this error instance which may provide additional details about the nature of the error.",
    ) as Error & { digest?: string };
    error.digest = "abc123";

    const { result } = renderHook(() => useChunkLoadRecovery(error));

    expect(reloadSpy).not.toHaveBeenCalled();
    expect(result.current).toBe(false);
  });

  it("ignora um valor corrompido/antigo em sessionStorage em vez de quebrar (formato anterior à mudança pra JSON)", () => {
    sessionStorage.setItem(GUARD_KEY, "not-json-and-not-a-number");
    vi.useFakeTimers();

    const { result } = renderHook(() => useChunkLoadRecovery(chunkLoadError()));
    vi.runAllTimers();

    expect(reloadSpy).toHaveBeenCalledTimes(1);
    expect(result.current).toBe(true);
    vi.useRealTimers();
  });
});
