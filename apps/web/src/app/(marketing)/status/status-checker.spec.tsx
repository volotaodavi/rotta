import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { StatusChecker } from "./status-checker";

/**
 * Primeiro teste de componente do monorepo em `apps/web` (Dossiê 34 —
 * Prompt 24) — prova que a infraestrutura de teste (Vitest + Testing
 * Library, `vitest.config.ts`) funciona de ponta a ponta, não só que
 * este componente específico está correto.
 *
 * `cleanup()` explícito (não implícito): `StatusChecker` agenda um
 * `setInterval` de 30s em `useEffect` — sem desmontar entre testes, o
 * componente do teste anterior continuaria de pé, fazendo `fetch`
 * concorrente e vazando entre casos.
 */
describe("StatusChecker", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("mostra Operacional para cada serviço quando /health/ready responde ok", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        json: () => Promise.resolve({ status: "ok", database: true, cache: true }),
      }),
    );

    render(<StatusChecker />);

    await waitFor(() => {
      expect(screen.getAllByText("Operacional")).toHaveLength(3);
    });
  });

  it("mostra Degradado no serviço específico que falhou (ex. cache indisponível)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        json: () => Promise.resolve({ status: "degraded", database: true, cache: false }),
      }),
    );

    render(<StatusChecker />);

    // A linha "API" usa `status` (que aqui é "degraded"); "Banco de
    // dados" usa `database` (true → Operacional); "Cache" usa `cache`
    // (false → Degradado). Resultado esperado: 1 Operacional, 2 Degradado.
    await waitFor(() => {
      expect(screen.getAllByText("Operacional")).toHaveLength(1);
      expect(screen.getAllByText("Degradado")).toHaveLength(2);
    });
  });

  it("mostra Fora do ar quando a API está inalcançável (fetch rejeita)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network error")));

    render(<StatusChecker />);

    await waitFor(() => {
      expect(screen.getAllByText("Fora do ar")).toHaveLength(3);
    });
  });
});
