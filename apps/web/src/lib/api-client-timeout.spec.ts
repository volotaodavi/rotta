import {
  ApiError,
  createApiClient,
  deveRepetirLeitura,
  STATUS_TEMPO_ESGOTADO,
  TIMEOUT_PADRAO_MS,
  TIMEOUT_UPLOAD_MS,
} from "@rotta/api-client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Testa `@rotta/api-client`, não `apps/web`. Mora aqui porque o pacote
 * compartilhado não tem runner próprio e o web é um dos consumidores —
 * e o mesmo travamento aconteceria no Painel Web.
 *
 * O bug que estes testes impedem de voltar (18/09/2026): o app ficava
 * preso na splash azul porque `fetch` não tem timeout embutido. Uma
 * requisição para a API em cold start nunca resolvia E nunca rejeitava,
 * então o `catch` de `auth-context.tsx` — o caminho que leva o usuário
 * para a tela de login quando a sessão não pode ser renovada — jamais
 * rodava, e `status` ficava em `"loading"` para sempre.
 *
 * O que importa aqui não é "existe um timeout": é que a requisição
 * REJEITA. Promessa pendurada para sempre é o modo de falha que congela
 * a interface inteira, porque nenhum tratamento de erro alcança.
 */

/**
 * `fetch` que nunca responde — exatamente a API em cold start.
 *
 * Checa `signal.aborted` ANTES de registrar o listener porque o `fetch`
 * real faz isso, e sem essa checagem o mock mente: `request()` tem um
 * `await` antes de chamar o fetch, então um `abort()` disparado logo
 * depois da chamada acontece enquanto o listener ainda nem existe — e
 * `addEventListener` num signal já abortado nunca dispara.
 */
function fetchQuePendura() {
  return vi.fn((_url: string, init?: RequestInit) => {
    const abortado = () => new DOMException("Aborted", "AbortError");
    return new Promise<Response>((_resolve, reject) => {
      const signal = init?.signal;
      if (signal?.aborted) {
        reject(abortado());
        return;
      }
      signal?.addEventListener("abort", () => reject(abortado()));
    });
  });
}

const novoCliente = () => createApiClient({ baseUrl: "https://api.teste", platform: "mobile" });

describe("timeout do cliente de API", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("rejeita quando o servidor nunca responde, em vez de pendurar para sempre", async () => {
    vi.stubGlobal("fetch", fetchQuePendura());

    // O `catch` precisa estar anexado antes de avançar o relógio, senão
    // a rejeição vira "unhandled".
    const resultado = novoCliente()
      .request("/qualquer")
      .then(
        () => "resolveu" as const,
        (erro: unknown) => erro,
      );

    await vi.advanceTimersByTimeAsync(TIMEOUT_PADRAO_MS);

    const erro = await resultado;
    expect(erro).toBeInstanceOf(ApiError);
    expect((erro as ApiError).status).toBe(STATUS_TEMPO_ESGOTADO);
    expect((erro as ApiError).message).toContain("demorou demais");
  });

  it("não aborta antes da hora", async () => {
    vi.stubGlobal("fetch", fetchQuePendura());

    let assentou = false;
    void novoCliente()
      .request("/qualquer")
      .then(
        () => (assentou = true),
        () => (assentou = true),
      );

    await vi.advanceTimersByTimeAsync(TIMEOUT_PADRAO_MS - 1_000);
    expect(assentou).toBe(false);
  });

  it("respeita o cancelamento de quem chamou, sem virar erro de tempo", async () => {
    // Timers reais aqui de propósito: este caso não espera tempo nenhum
    // passar, e sob timers falsos o `await` da rejeição ficava sem nada
    // que empurrasse a fila de microtasks.
    vi.useRealTimers();
    vi.stubGlobal("fetch", fetchQuePendura());
    const chamador = new AbortController();

    const resultado = novoCliente()
      .request("/qualquer", { signal: chamador.signal })
      .then(
        () => "resolveu" as const,
        (erro: unknown) => erro,
      );

    chamador.abort();
    const erro = await resultado;

    // Cancelamento intencional (troca de tela, busca digitada) continua
    // sendo o que era — nunca "o servidor demorou demais".
    expect(erro).not.toBeInstanceOf(ApiError);
  });

  it("dá mais tempo para upload — rede móvel lenta não é erro", () => {
    // Um teto curto aqui transformaria "conexão ruim" em "não consigo
    // enviar meus documentos".
    expect(TIMEOUT_UPLOAD_MS).toBeGreaterThan(TIMEOUT_PADRAO_MS);
  });
});

describe("política de retry e o tempo esgotado", () => {
  it("repete tempo esgotado — é transitório, e a 2ª tentativa pega a API já de pé", () => {
    const erro = new ApiError(STATUS_TEMPO_ESGOTADO, {
      code: "TEMPO_ESGOTADO",
      message: "demorou",
    });
    expect(deveRepetirLeitura(0, erro)).toBe(true);
  });

  it("continua NÃO repetindo os demais 4xx", () => {
    for (const status of [400, 401, 403, 404, 422, 429]) {
      const erro = new ApiError(status, { code: "X", message: "x" });
      expect(deveRepetirLeitura(0, erro)).toBe(false);
    }
  });

  it("para de repetir o tempo esgotado depois do limite", () => {
    const erro = new ApiError(STATUS_TEMPO_ESGOTADO, {
      code: "TEMPO_ESGOTADO",
      message: "demorou",
    });
    expect(deveRepetirLeitura(99, erro)).toBe(false);
  });
});
