import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AcessoRuralCard } from "../acesso-rural-card";

import type { Route as RotaDaRotta } from "@rotta/api-client";

/**
 * "Condições de acesso (zona rural)" na tela da rota (SETE-03).
 *
 * ## O que estes testes trancam
 *
 * O cartão grava cinco booleanos que ninguém olha no dia a dia. Dois
 * erros aqui só apareceriam na prefeitura, meses depois:
 *
 * 1. **Mandar campo que a pessoa não mexeu.** O `update` da rota aceita
 *    qualquer subconjunto. Se o cartão mandasse os cinco sempre, um
 *    obstáculo marcado em outra tela seria desmarcado por quem só veio
 *    conferir.
 *
 * 2. **Salvar sem alteração.** Um botão sempre habilitado gera `UPDATED`
 *    na auditoria da rota a cada clique curioso, e a trilha de quem
 *    mexeu em quê deixa de valer.
 */

const mutateAsync = vi.fn();
let pendente = false;

vi.mock("@/features/routes/hooks/use-routes", () => ({
  useUpdateRoute: () => ({
    mutateAsync: (input: unknown) => mutateAsync(input),
    get isPending() {
      return pendente;
    },
  }),
}));

let mockTags: string[] = ["LICITADA"];

vi.mock("@/features/company/hooks/use-company", () => ({
  useMyCompanyTags: () => ({
    tags: mockTags,
    isLoading: false,
    temTag: (tag: string) => mockTags.includes(tag),
  }),
}));

vi.mock("@rotta/auth/web", () => ({
  useAuth: () => ({ user: { id: "user-1", companyId: "company-1" } }),
}));

function construirRota(sobrescritas: Partial<RotaDaRotta> = {}): RotaDaRotta {
  return {
    id: "route-1",
    companyId: "company-1",
    nome: "Rota Sítio",
    turno: "MANHA",
    diasSemana: ["SEGUNDA"],
    status: "ATIVA",
    veiculoPadraoId: null,
    motoristaPadraoId: null,
    monitorPadraoId: null,
    acessoPorteira: false,
    acessoMataBurro: false,
    acessoColchete: false,
    acessoAtoleiro: false,
    acessoPonteRustica: false,
    createdAt: "2026-11-10T12:00:00.000Z",
    updatedAt: "2026-11-10T12:00:00.000Z",
    ...sobrescritas,
  };
}

beforeEach(() => {
  mockTags = ["LICITADA"];
  pendente = false;
  mutateAsync.mockResolvedValue(undefined);
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("recorte por habilitação", () => {
  it("empresa só PRIVADA não vê as condições de acesso", () => {
    mockTags = ["PRIVADA"];

    render(<AcessoRuralCard route={construirRota()} />);

    expect(screen.queryByText("Condições de acesso (zona rural)")).not.toBeInTheDocument();
  });

  it("empresa LICITADA vê as cinco caixas", () => {
    render(<AcessoRuralCard route={construirRota()} />);

    expect(screen.getAllByRole("checkbox")).toHaveLength(5);
  });
});

describe("o que a tela mostra", () => {
  it("cada caixa traz o que o obstáculo é, não só o nome dele", () => {
    render(<AcessoRuralCard route={construirRota()} />);

    // "Colchete" é palavra de quem anda em estrada de terra. Sem a
    // explicação, marcar a caixa errada aqui vira cadastro errado no
    // sistema federal.
    expect(screen.getByText(/Passagem lateral estreita na cerca/)).toBeInTheDocument();
    expect(screen.getByText(/barras de madeira ou ferro/)).toBeInTheDocument();
  });

  it("o que está gravado começa marcado", () => {
    render(<AcessoRuralCard route={construirRota({ acessoAtoleiro: true })} />);

    expect(screen.getByRole("checkbox", { name: /Atoleiro/ })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: /Porteira/ })).not.toBeChecked();
  });

  it("o rótulo clicável é a linha inteira, nome e explicação", async () => {
    const usuario = userEvent.setup();
    render(<AcessoRuralCard route={construirRota()} />);

    // Clicar no texto da explicação marca a caixa: a área de toque é a
    // linha, não o quadrado de 20px.
    await usuario.click(screen.getByText("Tem trecho que atola em dia de chuva."));

    expect(screen.getByRole("checkbox", { name: /Atoleiro/ })).toBeChecked();
  });
});

describe("salvar", () => {
  it("sem alteração, o botão fica desabilitado", () => {
    render(<AcessoRuralCard route={construirRota()} />);

    expect(screen.getByRole("button", { name: "Salvar condições" })).toBeDisabled();
  });

  it("manda os cinco campos com o estado atual, e nada além deles", async () => {
    const usuario = userEvent.setup();
    render(<AcessoRuralCard route={construirRota({ acessoPorteira: true })} />);

    await usuario.click(screen.getByRole("checkbox", { name: /Ponte rústica/ }));
    await usuario.click(screen.getByRole("button", { name: "Salvar condições" }));

    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalledWith({
        acessoPorteira: true,
        acessoMataBurro: false,
        acessoColchete: false,
        acessoAtoleiro: false,
        acessoPonteRustica: true,
      });
    });
  });

  it("desmarcar e marcar de volta desabilita o botão outra vez", async () => {
    const usuario = userEvent.setup();
    render(<AcessoRuralCard route={construirRota()} />);

    const caixa = screen.getByRole("checkbox", { name: /Porteira/ });
    await usuario.click(caixa);
    expect(screen.getByRole("button", { name: "Salvar condições" })).toBeEnabled();

    await usuario.click(caixa);
    expect(screen.getByRole("button", { name: "Salvar condições" })).toBeDisabled();
  });

  it("falha aparece na tela", async () => {
    const usuario = userEvent.setup();
    mutateAsync.mockRejectedValue(new Error("qualquer coisa"));

    render(<AcessoRuralCard route={construirRota()} />);

    await usuario.click(screen.getByRole("checkbox", { name: /Mata-burro/ }));
    await usuario.click(screen.getByRole("button", { name: "Salvar condições" }));

    expect(await screen.findByText(/Não foi possível salvar agora/)).toBeInTheDocument();
  });
});
