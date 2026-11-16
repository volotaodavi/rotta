import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { CookieConsentBanner } from "@/components/cookie-consent-banner";
import { setCookieConsent } from "@/lib/cookie-consent";
import { InstallAppPrompt } from "@/providers/install-app-prompt";

/**
 * O banner de cookies não pode esconder o elemento com foco
 * (`A11Y-01`, `docs/53-acessibilidade-do-site.md`). WCAG 2.4.11 Focus
 * Not Obscured (Minimum), nível AA.
 *
 * ## O que isso resolve
 *
 * O banner é `fixed bottom-0` e, num aparelho de 390px, chega a ocupar
 * um quinto da tela. Reservar espaço no fim do documento (o que já
 * havia) salva o ÚLTIMO elemento da página. Não salva um campo no meio
 * dela: quando o Tab chega lá, o navegador rola o campo para a área
 * visível — e, para ele, a área visível inclui o pedaço que o banner
 * cobre. Medido a 390×844 em `/criar-conta/empresa`, antes da
 * correção: oito campos do formulário terminavam atrás do banner,
 * seis deles 100% cobertos.
 *
 * `scroll-padding-bottom` no `<html>` é a propriedade que o próprio
 * navegador consulta antes de rolar algo para o foco. Não há evento
 * interceptado.
 *
 * ## Por que o jsdom basta aqui
 *
 * A rolagem em si não dá para testar no jsdom — ela foi medida em
 * navegador real, em duas passadas (com e sem a correção), e o número
 * está no commit. O que este teste protege é o que uma regressão
 * apagaria sem fazer barulho: a propriedade deixar de ser escrita, ou
 * deixar de ser limpa quando o banner sai.
 */

class ResizeObserverFalso {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

beforeEach(() => {
  vi.stubGlobal("ResizeObserver", ResizeObserverFalso);
  window.localStorage.clear();
  window.sessionStorage.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
  document.documentElement.style.scrollPaddingBottom = "";
  document.body.style.paddingBottom = "";
});

describe("banner de cookies", () => {
  it("escreve o scroll-padding enquanto está na tela", () => {
    render(<CookieConsentBanner temRastreamento />);
    expect(screen.getByRole("region", { name: "Consentimento de cookies" })).toBeInTheDocument();
    expect(document.documentElement.style.scrollPaddingBottom).toBe(
      "var(--altura-do-banner-de-cookies)",
    );
    expect(
      document.documentElement.style.getPropertyValue("--altura-do-banner-de-cookies"),
    ).toMatch(/px$/);
  });

  it("limpa tudo ao sair", () => {
    const { unmount } = render(<CookieConsentBanner temRastreamento />);
    unmount();
    expect(document.documentElement.style.scrollPaddingBottom).toBe("");
    expect(document.documentElement.style.getPropertyValue("--altura-do-banner-de-cookies")).toBe(
      "",
    );
    expect(document.body.style.paddingBottom).toBe("");
  });

  it("não aparece, nem mexe em nada, sem rastreamento configurado", () => {
    render(<CookieConsentBanner temRastreamento={false} />);
    expect(screen.queryByRole("region", { name: "Consentimento de cookies" })).toBeNull();
    expect(document.documentElement.style.scrollPaddingBottom).toBe("");
  });
});

/**
 * Dois elementos fixos empilhados no rodapé de uma tela de 844px
 * deixam ainda menos espaço para o campo com foco — e o de baixo é o
 * que a lei exige. O convite para instalar o app espera a decisão.
 */
describe('convite "Instale o app"', () => {
  function dispararConvite(): void {
    const evento = new Event("beforeinstallprompt");
    Object.assign(evento, {
      prompt: async () => {},
      userChoice: Promise.resolve({ outcome: "dismissed" }),
    });
    act(() => {
      window.dispatchEvent(evento);
    });
  }

  it("fica calado enquanto o banner de cookies está aberto", () => {
    render(<InstallAppPrompt temRastreamento />);
    dispararConvite();
    expect(screen.queryByText("Instale o app da Rotta")).toBeNull();
  });

  it("aparece assim que a pessoa decide sobre os cookies", () => {
    render(<InstallAppPrompt temRastreamento />);
    dispararConvite();
    // Não é uma leitura única na montagem: o banner some quando a
    // decisão é tomada, e o convite precisa saber disso sem recarregar
    // a página.
    act(() => {
      setCookieConsent("rejected");
    });
    expect(screen.getByText("Instale o app da Rotta")).toBeInTheDocument();
  });

  it("aparece normalmente num site sem rastreamento, onde não há banner", () => {
    render(<InstallAppPrompt temRastreamento={false} />);
    dispararConvite();
    expect(screen.getByText("Instale o app da Rotta")).toBeInTheDocument();
  });
});
