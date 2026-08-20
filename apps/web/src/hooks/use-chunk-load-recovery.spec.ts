import { renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useChunkLoadRecovery } from "./use-chunk-load-recovery";

function chunkLoadError(message = "Loading chunk 8039 failed."): Error {
  const error = new Error(message);
  error.name = "ChunkLoadError";
  return error;
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

  it("recarrega a página exatamente uma vez diante de um ChunkLoadError real", () => {
    const { result } = renderHook(() => useChunkLoadRecovery(chunkLoadError()));

    expect(reloadSpy).toHaveBeenCalledTimes(1);
    expect(result.current).toBe(true);
    expect(sessionStorage.getItem("rotta_chunk_reload_at")).not.toBeNull();
  });

  it("NÃO recarrega para um erro de aplicação normal (não é ChunkLoadError)", () => {
    const { result } = renderHook(() =>
      useChunkLoadRecovery(new Error("Não foi possível carregar os alunos da rota.")),
    );

    expect(reloadSpy).not.toHaveBeenCalled();
    expect(result.current).toBe(false);
  });

  it("guarda de 10s evita loop infinito de reload", () => {
    // Simula um reload já disparado há pouco (dentro da janela de 10s).
    sessionStorage.setItem("rotta_chunk_reload_at", String(Date.now()));

    const { result } = renderHook(() => useChunkLoadRecovery(chunkLoadError()));

    expect(reloadSpy).not.toHaveBeenCalled();
    expect(result.current).toBe(false);
  });

  it("permite recarregar de novo depois que a janela de 10s expira", () => {
    sessionStorage.setItem("rotta_chunk_reload_at", String(Date.now() - 11_000));

    const { result } = renderHook(() => useChunkLoadRecovery(chunkLoadError()));

    expect(reloadSpy).toHaveBeenCalledTimes(1);
    expect(result.current).toBe(true);
  });
});
