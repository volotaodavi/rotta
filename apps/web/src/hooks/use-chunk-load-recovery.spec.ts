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

  it("recarrega a página na primeira ocorrência de um ChunkLoadError real", () => {
    const { result } = renderHook(() => useChunkLoadRecovery(chunkLoadError()));

    expect(reloadSpy).toHaveBeenCalledTimes(1);
    expect(result.current).toBe(true);
    expect(sessionStorage.getItem(GUARD_KEY)).not.toBeNull();
  });

  it("NÃO recarrega para um erro de aplicação normal (não é ChunkLoadError)", () => {
    const { result } = renderHook(() =>
      useChunkLoadRecovery(new Error("Não foi possível carregar os alunos da rota.")),
    );

    expect(reloadSpy).not.toHaveBeenCalled();
    expect(result.current).toBe(false);
  });

  /**
   * ACHADO REAL (ver nota grande em `use-chunk-load-recovery.ts`): a
   * ocorrência mais recente em produção provou que uma corrida
   * intermitente de cold start pode sobreviver a UM reload — por isso
   * agora tenta até `MAX_RELOAD_ATTEMPTS` (2) vezes no mesmo episódio,
   * não mais só uma.
   */
  it("tenta recarregar uma SEGUNDA vez se o mesmo episódio de erro persistir", () => {
    setGuardState(1, Date.now() - 2_000);

    const { result } = renderHook(() => useChunkLoadRecovery(chunkLoadError()));

    expect(reloadSpy).toHaveBeenCalledTimes(1);
    expect(result.current).toBe(true);
    expect(JSON.parse(sessionStorage.getItem(GUARD_KEY) ?? "{}").attempts).toBe(2);
  });

  it("desiste depois de MAX_RELOAD_ATTEMPTS (2) tentativas no mesmo episódio", () => {
    setGuardState(2, Date.now() - 2_000);

    const { result } = renderHook(() => useChunkLoadRecovery(chunkLoadError()));

    expect(reloadSpy).not.toHaveBeenCalled();
    expect(result.current).toBe(false);
  });

  it("começa um episódio novo (zera a contagem) depois que a janela de 20s expira", () => {
    setGuardState(2, Date.now() - 21_000);

    const { result } = renderHook(() => useChunkLoadRecovery(chunkLoadError()));

    expect(reloadSpy).toHaveBeenCalledTimes(1);
    expect(result.current).toBe(true);
    expect(JSON.parse(sessionStorage.getItem(GUARD_KEY) ?? "{}").attempts).toBe(1);
  });

  it("recarrega diante da mensagem genérica de 'Server Components render' sem digest (caso real de produção)", () => {
    const error = new Error(
      "An error occurred in the Server Components render. The specific message is omitted in production builds to avoid leaking sensitive details. A digest property is included on this error instance which may provide additional details about the nature of the error.",
    );

    const { result } = renderHook(() => useChunkLoadRecovery(error));

    expect(reloadSpy).toHaveBeenCalledTimes(1);
    expect(result.current).toBe(true);
  });

  it("NÃO recarrega a mesma mensagem genérica quando vem com um digest real (erro de app de verdade, não bundle obsoleto/cold start)", () => {
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

    const { result } = renderHook(() => useChunkLoadRecovery(chunkLoadError()));

    expect(reloadSpy).toHaveBeenCalledTimes(1);
    expect(result.current).toBe(true);
  });
});
