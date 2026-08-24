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
   * ACHADO REAL (ver nota grande em `use-chunk-load-recovery.ts`): a
   * ocorrência mais recente em produção provou que uma corrida
   * intermitente de cold start pode sobreviver a UM reload — por isso
   * agora tenta até `MAX_RELOAD_ATTEMPTS` (3) vezes no mesmo episódio,
   * não mais só uma.
   */
  it("tenta recarregar uma SEGUNDA vez se o mesmo episódio de erro persistir", () => {
    setGuardState(1, Date.now() - 2_000);
    vi.useFakeTimers();

    const { result } = renderHook(() => useChunkLoadRecovery(chunkLoadError()));
    vi.runAllTimers();

    expect(reloadSpy).toHaveBeenCalledTimes(1);
    expect(result.current).toBe(true);
    expect(JSON.parse(sessionStorage.getItem(GUARD_KEY) ?? "{}").attempts).toBe(2);
    vi.useRealTimers();
  });

  /**
   * 2ª OCORRÊNCIA REAL (conta `Davi Volotão`, ver nota grande em
   * `use-chunk-load-recovery.ts`): 2 tentativas não bastaram — uma 3ª
   * carga na mesma sessão ainda reproduziu o erro. `MAX_RELOAD_ATTEMPTS`
   * subiu pra 3 por causa disso.
   */
  it("tenta recarregar uma TERCEIRA vez se o mesmo episódio de erro persistir de novo", () => {
    setGuardState(2, Date.now() - 2_000);
    vi.useFakeTimers();

    const { result } = renderHook(() => useChunkLoadRecovery(chunkLoadError()));
    vi.runAllTimers();

    expect(reloadSpy).toHaveBeenCalledTimes(1);
    expect(result.current).toBe(true);
    expect(JSON.parse(sessionStorage.getItem(GUARD_KEY) ?? "{}").attempts).toBe(3);
    vi.useRealTimers();
  });

  it("desiste depois de MAX_RELOAD_ATTEMPTS (3) tentativas no mesmo episódio", () => {
    setGuardState(3, Date.now() - 2_000);

    const { result } = renderHook(() => useChunkLoadRecovery(chunkLoadError()));

    expect(reloadSpy).not.toHaveBeenCalled();
    expect(result.current).toBe(false);
  });

  it("começa um episódio novo (zera a contagem) depois que a janela de 30s expira", () => {
    setGuardState(3, Date.now() - 31_000);
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
    vi.useFakeTimers();

    const { result } = renderHook(() => useChunkLoadRecovery(chunkLoadError()));
    vi.runAllTimers();

    expect(reloadSpy).toHaveBeenCalledTimes(1);
    expect(result.current).toBe(true);
    vi.useRealTimers();
  });
});
