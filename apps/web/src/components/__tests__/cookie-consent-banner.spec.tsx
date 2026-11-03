import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { CookieConsentBanner } from "../cookie-consent-banner";

/**
 * O banner de cookies, e o espaço que ele precisa reservar.
 *
 * ## O defeito que estes testes trancam
 *
 * O banner é `fixed ... bottom-0`: flutua por cima do conteúdo e não
 * ocupa espaço no documento. Num celular o texto quebra em cinco linhas
 * e a faixa passa de 200px, cobrindo o ÚLTIMO elemento de qualquer
 * página — e em 03/11/2026 isso deixou o botão "Criar empresa" da tela
 * de cadastro inalcançável num iPhone. Formulário preenchido, termos
 * aceitos, e nada acontecia.
 *
 * ## O que este arquivo prova, e o que NÃO prova
 *
 * Prova que o componente reserva espaço enquanto está visível e devolve
 * esse espaço quando a pessoa decide. É o guarda contra alguém remover
 * o efeito num refactor.
 *
 * Não prova que a altura reservada é a CERTA: no jsdom não há layout,
 * `offsetHeight` é sempre 0 e `ResizeObserver` não existe (os dois são
 * forjados abaixo). Quem prova isso é a suíte no tamanho de iPhone
 * (`playwright.celular.config.ts`), num navegador de verdade — foi ela
 * que achou o defeito, e é ela que o pega de novo.
 */

const ALTURA_FORJADA = 212;

beforeEach(() => {
  window.localStorage.clear();

  // `ResizeObserver` não existe no jsdom. O dublê chama o callback uma
  // vez no `observe`, que é o bastante para o efeito escrever a medida.
  vi.stubGlobal(
    "ResizeObserver",
    class {
      constructor(private readonly callback: () => void) {}
      observe(): void {
        this.callback();
      }
      disconnect(): void {}
      unobserve(): void {}
    },
  );

  // `offsetHeight` é 0 no jsdom para qualquer elemento. Sem forjar,
  // o teste afirmaria "reservou 0px", que é indistinguível de não ter
  // reservado nada — exatamente o defeito que ele deveria pegar.
  Object.defineProperty(HTMLElement.prototype, "offsetHeight", {
    configurable: true,
    get(): number {
      return ALTURA_FORJADA;
    },
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  document.body.style.paddingBottom = "";
});

describe("o banner reserva o espaço que ocupa", () => {
  it("enquanto está visível, o fim da página ganha a altura da faixa", async () => {
    render(<CookieConsentBanner temRastreamento />);

    await screen.findByRole("region", { name: "Consentimento de cookies" });
    await waitFor(() => expect(document.body.style.paddingBottom).toBe(`${ALTURA_FORJADA}px`));
  });

  it("depois de ACEITAR, o espaço é devolvido", async () => {
    render(<CookieConsentBanner temRastreamento />);
    await screen.findByRole("region", { name: "Consentimento de cookies" });

    await userEvent.click(screen.getByRole("button", { name: "Aceitar" }));

    await waitFor(() => expect(document.body.style.paddingBottom).toBe(""));
  });

  it("depois de RECUSAR também — recusar não é um caminho de segunda classe", async () => {
    // A LGPD exige que negar seja tão fácil quanto aceitar. Se só o
    // "Aceitar" devolvesse o espaço, quem recusa ficaria com uma folga
    // permanente no rodapé de todas as telas.
    render(<CookieConsentBanner temRastreamento />);
    await screen.findByRole("region", { name: "Consentimento de cookies" });

    await userEvent.click(screen.getByRole("button", { name: "Recusar" }));

    await waitFor(() => expect(document.body.style.paddingBottom).toBe(""));
  });

  it("sem rastreamento configurado, não há banner nem folga nenhuma", async () => {
    // O banner só existe se houver medição de terceiro de verdade. Sem
    // ela, reservar espaço seria tirar um pedaço de toda tela por nada.
    render(<CookieConsentBanner temRastreamento={false} />);

    await waitFor(() => expect(document.body.style.paddingBottom).toBe(""));
    expect(screen.queryByRole("region", { name: "Consentimento de cookies" })).toBeNull();
  });
});
