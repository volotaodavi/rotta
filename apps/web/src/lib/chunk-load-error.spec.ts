import { describe, expect, it } from "vitest";

import { isChunkLoadError } from "./chunk-load-error";

/**
 * Casos reais capturados via `reportClientError` (ver nota em
 * `@/hooks/use-chunk-load-recovery.ts`) e confirmados numa reprodução
 * manual: aba com chunk de um deploy anterior tentando abrir uma rota
 * ainda não visitada nessa sessão lança exatamente
 * `ChunkLoadError: Loading chunk 8039 failed.` (`digest: null`, sem
 * stack de código do app — só frames do runtime do webpack).
 */
describe("isChunkLoadError", () => {
  it("reconhece pelo nome ChunkLoadError (caso real do webpack)", () => {
    const error = new Error("Loading chunk 8039 failed.");
    error.name = "ChunkLoadError";
    expect(isChunkLoadError(error)).toBe(true);
  });

  it("reconhece pela mensagem quando o nome não é preservado (ex.: serialização em produção)", () => {
    expect(isChunkLoadError(new Error("Loading chunk 42 failed."))).toBe(true);
    expect(isChunkLoadError(new Error("Loading CSS chunk 7 failed."))).toBe(true);
  });

  it("reconhece falha de import() dinâmico (variante do Vite/ESM, mesma causa raiz)", () => {
    expect(isChunkLoadError(new Error("Failed to fetch dynamically imported module: /x.js"))).toBe(
      true,
    );
  });

  it("não reconhece um Error de aplicação normal", () => {
    expect(isChunkLoadError(new Error("Não foi possível carregar os alunos da rota."))).toBe(false);
  });

  it("não reconhece valores que não são Error", () => {
    expect(isChunkLoadError("Loading chunk 1 failed.")).toBe(false);
    expect(isChunkLoadError(null)).toBe(false);
    expect(isChunkLoadError(undefined)).toBe(false);
  });
});
