import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { StaleBuildWatchdog } from "./stale-build-watchdog";

function htmlWithBuildId(buildId: string): string {
  return `<html><head><meta name="rotta-build-id" content="${buildId}"></head><body></body></html>`;
}

describe("StaleBuildWatchdog", () => {
  let reloadSpy: ReturnType<typeof vi.fn>;
  let fetchSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    sessionStorage.clear();
    reloadSpy = vi.fn();
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { ...window.location, reload: reloadSpy, pathname: "/rotas/abc" },
    });
    // `getOwnBuildId()` lê direto da <meta> já no DOM (não de `process.env`
    // — ver a nota real em `@/lib/build-id.ts`), então o "build já
    // carregado" neste teste é simplesmente a própria <meta> da página de teste.
    document.head.innerHTML = '<meta name="rotta-build-id" content="build-atual">';
  });

  afterEach(() => {
    vi.restoreAllMocks();
    document.head.innerHTML = "";
  });

  it("recarrega quando o build id do HTML fresco difere do bundle já carregado", async () => {
    fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(htmlWithBuildId("build-novo")),
    });
    vi.stubGlobal("fetch", fetchSpy);

    render(<StaleBuildWatchdog />);
    await vi.waitFor(() => expect(reloadSpy).toHaveBeenCalledTimes(1));

    expect(fetchSpy).toHaveBeenCalledWith(
      "/rotas/abc",
      expect.objectContaining({ cache: "no-store" }),
    );
    expect(sessionStorage.getItem("rotta_stale_build_reload_at")).not.toBeNull();
  });

  it("NÃO recarrega quando o build id bate (navegador já está atualizado)", async () => {
    fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(htmlWithBuildId("build-atual")),
    });
    vi.stubGlobal("fetch", fetchSpy);

    render(<StaleBuildWatchdog />);
    await vi.waitFor(() => expect(fetchSpy).toHaveBeenCalled());

    expect(reloadSpy).not.toHaveBeenCalled();
  });

  it("nunca lança quando o fetch falha (rede instável/offline)", async () => {
    fetchSpy = vi.fn().mockRejectedValue(new Error("network down"));
    vi.stubGlobal("fetch", fetchSpy);

    expect(() => render(<StaleBuildWatchdog />)).not.toThrow();
    await vi.waitFor(() => expect(fetchSpy).toHaveBeenCalled());
    expect(reloadSpy).not.toHaveBeenCalled();
  });

  it("guarda de 10s evita loop infinito de reload", async () => {
    sessionStorage.setItem("rotta_stale_build_reload_at", String(Date.now()));
    fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(htmlWithBuildId("build-novo")),
    });
    vi.stubGlobal("fetch", fetchSpy);

    render(<StaleBuildWatchdog />);
    await vi.waitFor(() => expect(fetchSpy).toHaveBeenCalled());

    expect(reloadSpy).not.toHaveBeenCalled();
  });

  /**
   * O defeito que motivou a mudança de 02/10/2026: a checagem acontecia
   * UMA vez, no carregamento. Uma aba aberta a tarde inteira nunca
   * descobria que saiu deploy novo. Agora ela descobre — e, com a
   * sessão em andamento, AVISA em vez de recarregar na cara da pessoa,
   * que poderia estar com um formulário meio preenchido.
   */
  it("avisa, sem recarregar, quando o deploy novo sai com a aba já aberta", async () => {
    fetchSpy = vi
      .fn()
      // Primeira checagem (no carregamento): ainda é o mesmo build.
      .mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(htmlWithBuildId("build-atual")),
      })
      // Checagem seguinte, disparada ao voltar pra aba: saiu deploy.
      .mockResolvedValue({ ok: true, text: () => Promise.resolve(htmlWithBuildId("build-novo")) });
    vi.stubGlobal("fetch", fetchSpy);

    render(<StaleBuildWatchdog />);
    await vi.waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(1));

    document.dispatchEvent(new Event("visibilitychange"));

    await vi.waitFor(() =>
      expect(screen.getByRole("button", { name: "Atualizar agora" })).toBeInTheDocument(),
    );
    expect(reloadSpy).not.toHaveBeenCalled();
  });
});
