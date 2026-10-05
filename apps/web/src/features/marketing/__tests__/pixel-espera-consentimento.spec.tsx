/**
 * @vitest-environment-options { "url": "https://rotta.exemplo/planos" }
 */
import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { MarketingTracking } from "../components/marketing-tracking";

/**
 * O Pixel do Meta entrou no site em 05/10/2026, e com ele uma promessa
 * escrita em página legal (`/legal/cookies`): nada de medição carrega
 * antes de a pessoa aceitar o aviso de cookies. Promessa em documento
 * jurídico sem teste é promessa que um refactor quebra em silêncio, e o
 * jeito que ela quebra é o pior possível: o site continua funcionando
 * perfeitamente, só passa a mentir.
 *
 * Por isso o teste olha o DOM, não a intenção: ou existe um `<script>`
 * do Pixel na árvore, ou não existe.
 *
 * A URL do ambiente é um host qualquer que NÃO seja `localhost`, porque
 * o componente desliga a medição em máquina de desenvolvimento de
 * propósito (evento de teste polui o mesmo Gerenciador de Eventos da
 * produção). O padrão do jsdom é `localhost`, que cairia justo nesse
 * desligamento e faria o teste passar por engano.
 */

const PIXEL = "2122632155047063";

function pixelNaTela(): HTMLElement | null {
  return document.getElementById("meta-pixel");
}

/** Qualquer chamada para o Meta, por script ou por imagem. */
function qualquerChamadaAoMeta(): HTMLElement | null {
  return document.querySelector<HTMLElement>(
    '[id="meta-pixel"], [src*="facebook.net"], [src*="facebook.com/tr"]',
  );
}

describe("MarketingTracking: o Pixel espera o consentimento", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.unstubAllGlobals();
    /*
      `next/script` injeta o `<script>` no documento, fora do container
      que a Testing Library desmonta sozinha entre os testes. Sem esta
      limpeza, o Pixel de um teste sobrevive no `<head>` e o teste
      seguinte "acha" um Pixel que ele mesmo não renderizou — o tipo de
      falso verde que faz um teste de consentimento não valer nada.
    */
    document
      .querySelectorAll('[data-nscript], [id="meta-pixel"], [src*="facebook"], [src*="google"]')
      .forEach((no) => no.remove());
    /*
      O jsdom do Vitest executa script injetado, então o trecho do Pixel
      roda de verdade e deixa `window.fbq` montado. Sem apagar, o teste
      seguinte herda um Pixel inicializado.
    */
    delete window.fbq;
    delete window.gtag;
  });

  it("não carrega nada antes da pessoa decidir", () => {
    render(<MarketingTracking metaPixelId={PIXEL} />);

    expect(pixelNaTela()).toBeNull();
    expect(qualquerChamadaAoMeta()).toBeNull();
  });

  it("não carrega nada quando a pessoa recusa", () => {
    window.localStorage.setItem("rotta-cookie-consent", "rejected");

    render(<MarketingTracking metaPixelId={PIXEL} />);

    expect(pixelNaTela()).toBeNull();
    expect(qualquerChamadaAoMeta()).toBeNull();
  });

  it("carrega o Pixel com o ID certo depois do aceite", () => {
    window.localStorage.setItem("rotta-cookie-consent", "accepted");

    render(<MarketingTracking metaPixelId={PIXEL} />);

    const script = pixelNaTela();
    expect(script).not.toBeNull();
    expect(script?.textContent).toContain(`fbq('init','${PIXEL}')`);
    expect(script?.textContent).toContain("fbq('track','PageView')");
  });

  it("não mede em maquina de desenvolvimento, mesmo com aceite", () => {
    window.localStorage.setItem("rotta-cookie-consent", "accepted");
    const original = window.location.hostname;
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { ...window.location, hostname: "localhost" },
    });

    try {
      render(<MarketingTracking metaPixelId={PIXEL} />);
      expect(qualquerChamadaAoMeta()).toBeNull();
    } finally {
      Object.defineProperty(window, "location", {
        configurable: true,
        value: { ...window.location, hostname: original },
      });
    }
  });

  it("não carrega nada quando nenhum identificador foi passado", () => {
    window.localStorage.setItem("rotta-cookie-consent", "accepted");

    render(<MarketingTracking />);

    expect(qualquerChamadaAoMeta()).toBeNull();
  });
});
