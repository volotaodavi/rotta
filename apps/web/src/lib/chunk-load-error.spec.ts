import { describe, expect, it } from "vitest";

import {
  isChunkLoadError,
  isRecoverableStaleBundleError,
  isStaleClientRenderError,
} from "./chunk-load-error";

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

/**
 * Casos reais capturados via `reportClientError` numa conta de produção
 * real (21 ocorrências, todas com essa mesma assinatura, investigadas
 * direto na tela "Erros do cliente" do Admin Rotta) — sempre a mesma
 * frase genérica de "Server Components render" que o Next.js usa em
 * produção, sempre com `digest` VAZIO. Um erro real de app redigido pelo
 * Next SEMPRE ganha um `digest`; a ausência dele é a mesma assinatura de
 * bundle desatualizado já mapeada em `isChunkLoadError`.
 */
describe("isStaleClientRenderError", () => {
  const GENERIC_MESSAGE =
    "An error occurred in the Server Components render. The specific message is omitted in production builds to avoid leaking sensitive details. A digest property is included on this error instance which may provide additional details about the nature of the error.";

  it("reconhece a mensagem genérica do Next.js quando não há digest (caso real de produção)", () => {
    expect(isStaleClientRenderError(new Error(GENERIC_MESSAGE))).toBe(true);
  });

  it("NÃO reconhece a mesma mensagem quando há um digest real — é um erro de app de verdade", () => {
    const error = new Error(GENERIC_MESSAGE) as Error & { digest?: string };
    error.digest = "abc123";
    expect(isStaleClientRenderError(error)).toBe(false);
  });

  it("não reconhece um Error de aplicação normal", () => {
    expect(
      isStaleClientRenderError(new Error("Não foi possível carregar os alunos da rota.")),
    ).toBe(false);
  });

  it("não reconhece valores que não são Error", () => {
    expect(isStaleClientRenderError(null)).toBe(false);
    expect(isStaleClientRenderError(undefined)).toBe(false);
  });
});

describe("isRecoverableStaleBundleError", () => {
  it("reconhece tanto ChunkLoadError quanto a variante sem digest", () => {
    const chunkError = new Error("Loading chunk 8039 failed.");
    chunkError.name = "ChunkLoadError";
    expect(isRecoverableStaleBundleError(chunkError)).toBe(true);

    expect(
      isRecoverableStaleBundleError(
        new Error("An error occurred in the Server Components render."),
      ),
    ).toBe(true);

    expect(isRecoverableStaleBundleError(new Error("Não foi possível salvar o aluno."))).toBe(
      false,
    );
  });
});
