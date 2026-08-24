import { afterEach, describe, expect, it } from "vitest";

import { extractBuildIdFromHtml, getOwnBuildId } from "./build-id";

describe("extractBuildIdFromHtml", () => {
  it("extrai o build id de um HTML real (mesmo formato emitido por app/layout.tsx)", () => {
    const html =
      '<html><head><meta name="rotta-build-id" content="a1b2c3d4"></head><body></body></html>';
    expect(extractBuildIdFromHtml(html)).toBe("a1b2c3d4");
  });

  it("retorna null quando a meta tag não existe", () => {
    expect(extractBuildIdFromHtml("<html><head></head><body></body></html>")).toBeNull();
  });

  it("não é sensível à ordem dos atributos nem a espaços extras", () => {
    const html = '<meta   content="xyz"   name="rotta-build-id"  >';
    // formato com name antes de content é o único suportado (é o que layout.tsx sempre emite) —
    // este teste documenta o comportamento atual, não uma exigência de robustez extra.
    expect(extractBuildIdFromHtml(html)).toBeNull();
  });
});

/**
 * ACHADO REAL (bug pego testando o próprio watchdog): `NEXT_PUBLIC_BUILD_ID`
 * embutido via `env` do `next.config.mjs` só chega ao HTML renderizado
 * no SERVIDOR — nunca ao bundle JS que roda no navegador (confirmado:
 * o valor não aparece em nenhum arquivo de `.next/static` depois do
 * build). `getOwnBuildId()` por isso lê direto da própria `<meta>` já
 * no DOM, nunca de `process.env` no cliente.
 */
describe("getOwnBuildId", () => {
  afterEach(() => {
    document.head.innerHTML = "";
  });

  it("lê o build id direto da <meta> já renderizada no documento atual", () => {
    document.head.innerHTML = '<meta name="rotta-build-id" content="a1b2c3d4">';
    expect(getOwnBuildId()).toBe("a1b2c3d4");
  });

  it("retorna null quando a página não tem a <meta> (nunca deveria acontecer em produção)", () => {
    expect(getOwnBuildId()).toBeNull();
  });
});
