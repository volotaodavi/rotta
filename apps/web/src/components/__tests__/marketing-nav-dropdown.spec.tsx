import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { MarketingNavDropdown } from "../marketing-nav-dropdown";

import type { Route } from "next";

/**
 * O agrupador "Para quem" do cabeçalho do site.
 *
 * O que está guardado aqui não é o visual: é o que faz um menu de
 * cabeçalho ser utilizável sem mouse. Um agrupador que abre e não
 * fecha pelo teclado tranca a pessoa dentro dele, e um que não
 * devolve o foco ao botão depois do Escape manda o próximo Tab para o
 * topo do documento.
 */

const LINKS: { href: Route; label: string }[] = [
  { href: "/#para-responsaveis" as Route, label: "Para responsáveis" },
  { href: "/#para-transportadores" as Route, label: "Para transportadores" },
  { href: "/#para-motoristas" as Route, label: "Para motoristas" },
];

function montar() {
  return render(<MarketingNavDropdown rotulo="Para quem" links={LINKS} />);
}

describe("o agrupador do cabeçalho", () => {
  it("começa fechado, e os links não aparecem", () => {
    montar();

    expect(screen.getByRole("button", { name: /para quem/i })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
    expect(screen.queryByText("Para responsáveis")).not.toBeVisible();
  });

  it("abre no clique e mostra os três públicos", async () => {
    const usuario = userEvent.setup();
    montar();

    await usuario.click(screen.getByRole("button", { name: /para quem/i }));

    expect(screen.getByRole("button", { name: /para quem/i })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
    for (const link of LINKS) {
      expect(screen.getByRole("link", { name: link.label })).toBeVisible();
    }
  });

  it("Escape fecha e devolve o foco ao botão", async () => {
    // Sem devolver o foco, ele fica no painel que acabou de sumir e o
    // próximo Tab recomeça do topo da página.
    const usuario = userEvent.setup();
    montar();
    const botao = screen.getByRole("button", { name: /para quem/i });

    await usuario.click(botao);
    await usuario.keyboard("{Escape}");

    expect(botao).toHaveAttribute("aria-expanded", "false");
    expect(botao).toHaveFocus();
  });

  it("clicar num link fecha o painel", async () => {
    const usuario = userEvent.setup();
    montar();

    await usuario.click(screen.getByRole("button", { name: /para quem/i }));
    await usuario.click(screen.getByRole("link", { name: "Para motoristas" }));

    expect(screen.getByRole("button", { name: /para quem/i })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
  });

  it("o botão aponta para o painel que ele abre", async () => {
    const usuario = userEvent.setup();
    montar();
    const botao = screen.getByRole("button", { name: /para quem/i });

    await usuario.click(botao);

    // `aria-controls` é o que diz ao leitor de tela que aquele painel
    // pertence a este botão. Sem ele, o painel é um bloco solto.
    const painelId = botao.getAttribute("aria-controls");
    expect(painelId).toBeTruthy();
    expect(document.getElementById(painelId as string)).toBeTruthy();
  });
});
