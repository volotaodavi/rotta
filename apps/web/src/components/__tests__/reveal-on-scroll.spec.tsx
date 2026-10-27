import { act, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { Reveal } from "../reveal-on-scroll";

/**
 * A animação de entrada da landing.
 *
 * O que está guardado aqui é o defeito, não o efeito: o componente
 * nascia com `opacity-0` na própria classe, inclusive no HTML servido.
 * Sem JavaScript o observador nunca roda, a opacidade nunca volta, e 23
 * blocos de texto da landing ficavam invisíveis. O conteúdo estava no
 * HTML e ninguém via.
 *
 * A regra que estes testes travam: **nenhuma classe de opacidade sai
 * daqui**. O estado invisível mora no CSS, atrás de `.com-js`, que um
 * script no `<head>` só adiciona quando o JavaScript de fato roda.
 */

afterEach(() => {
  vi.unstubAllGlobals();
});

/** jsdom não implementa `IntersectionObserver`. */
function observadorQueNuncaDispara(): void {
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      observe(): void {}
      unobserve(): void {}
      disconnect(): void {}
    },
  );
}

function pedindoMenosMovimento(reduzido: boolean): void {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: reduzido && query.includes("prefers-reduced-motion"),
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }));
}

describe("o estado inicial", () => {
  it("não carrega nenhuma classe de opacidade", () => {
    // É esta a asserção que impede o defeito de voltar. Qualquer
    // `opacity-0` na classe torna o conteúdo invisível sem JS.
    observadorQueNuncaDispara();
    pedindoMenosMovimento(false);

    render(
      <Reveal>
        <p>Transporte escolar rastreado</p>
      </Reveal>,
    );

    const bloco = screen.getByText("Transporte escolar rastreado").parentElement;
    expect(bloco?.className).not.toContain("opacity-0");
    expect(bloco?.className).not.toContain("opacity-100");
  });

  it("marca-se como pendente, que é o gancho do CSS atrás de `.com-js`", () => {
    observadorQueNuncaDispara();
    pedindoMenosMovimento(false);

    render(
      <Reveal>
        <p>Pendente</p>
      </Reveal>,
    );

    expect(screen.getByText("Pendente").parentElement).toHaveAttribute("data-reveal", "pendente");
  });

  it("o conteúdo está no documento mesmo sem o observador disparar", () => {
    // O ponto do conserto: sem JS (ou com o observador parado), o texto
    // continua lá e legível.
    observadorQueNuncaDispara();
    pedindoMenosMovimento(false);

    render(
      <Reveal>
        <p>Visível sem script</p>
      </Reveal>,
    );

    expect(screen.getByText("Visível sem script")).toBeInTheDocument();
  });
});

describe("quem pede menos movimento", () => {
  it("já nasce revelado, sem esperar o observador", () => {
    observadorQueNuncaDispara();
    pedindoMenosMovimento(true);

    render(
      <Reveal>
        <p>Sem animação</p>
      </Reveal>,
    );

    expect(screen.getByText("Sem animação").parentElement).toHaveAttribute(
      "data-reveal",
      "visivel",
    );
  });
});

describe("quando o bloco entra na tela", () => {
  it("passa a visível", () => {
    let disparar: (() => void) | null = null;
    vi.stubGlobal(
      "IntersectionObserver",
      class {
        constructor(callback: (entradas: { isIntersecting: boolean }[]) => void) {
          disparar = () => callback([{ isIntersecting: true }]);
        }
        observe(): void {}
        unobserve(): void {}
        disconnect(): void {}
      },
    );
    pedindoMenosMovimento(false);

    render(
      <Reveal>
        <p>Entrou</p>
      </Reveal>,
    );
    act(() => (disparar as unknown as () => void)());

    expect(screen.getByText("Entrou").parentElement).toHaveAttribute("data-reveal", "visivel");
  });
});
