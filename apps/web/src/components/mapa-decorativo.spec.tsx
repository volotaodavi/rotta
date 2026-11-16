import { readFileSync } from "node:fs";
import { join } from "node:path";

import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

/**
 * O mapa da hero é ilustrativo e sai da árvore de acessibilidade e da
 * ordem do Tab (`A11Y-08`, `docs/53-acessibilidade-do-site.md`).
 * WCAG 1.1.1 Non-text Content (nível A).
 *
 * ## Por que três testes e não um
 *
 * O `inert` do `RottaMap` depende de uma coisa que nenhum teste de
 * fonte pega: o React da versão em uso precisa de fato EMITIR o
 * atributo. No React 18 um booleano em atributo desconhecido era
 * descartado em silêncio — e um `inert` descartado não dá erro nenhum,
 * só deixa os marcadores tabuláveis outra vez. Por isso o primeiro
 * teste renderiza de verdade.
 *
 * Montar o `RottaMap` inteiro aqui não dá: ele instancia o MapLibre, que
 * precisa de WebGL. Daí os outros dois lerem a fonte, como
 * `(auth)/preenchimento-automatico.spec.ts` — e, como lá, os
 * comentários saem antes de qualquer comparação.
 */

function lerFonte(caminho: string): string {
  return readFileSync(join(__dirname, caminho), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, "")
    .replace(/^\s*\/\/.*$/gm, "");
}

describe("inert", () => {
  it("o React desta versão emite o atributo", () => {
    const { container } = render(<div data-testid="alvo" inert />);
    expect(container.querySelector("[data-testid=alvo]")?.hasAttribute("inert")).toBe(true);
  });
});

describe("hero-map-demo.tsx", () => {
  const fonte = lerFonte("hero-map-demo.tsx");

  it("marca o mapa da hero como decorativo", () => {
    expect(fonte).toMatch(/<RottaMap[\s\S]*?decorativo[\s\S]*?\/>/);
  });

  it("mantém um texto alternativo ao lado", () => {
    // Esconder o mapa sem dizer em texto o que ele mostra troca ruído
    // por silêncio — e silêncio, aqui, é informação perdida.
    expect(fonte).toContain('className="sr-only"');
  });
});

describe("@rotta/maps/web", () => {
  const fonte = lerFonte("../../../../packages/maps/src/web/index.tsx");

  it("todo marcador recebe o título como nome acessível", () => {
    // Dois pontos de chamada de propósito: o marcador novo e o
    // marcador que só mudou de posição (o `continue` do loop). Sem o
    // segundo, renomear uma parada deixaria o nome antigo no ar.
    const chamadas = fonte.match(/nomearMarcador\(/g) ?? [];
    expect(chamadas.length).toBeGreaterThanOrEqual(3); // declaração + 2 usos
    expect(fonte).toContain('element.setAttribute("aria-label", titulo)');
  });

  it("`decorativo` aplica aria-hidden e inert juntos", () => {
    // Só `aria-hidden` deixaria os marcadores tabuláveis e sem nome
    // nenhum — pior que não mexer.
    expect(fonte).toContain("aria-hidden={decorativo || undefined}");
    expect(fonte).toContain("inert={decorativo || undefined}");
  });
});
