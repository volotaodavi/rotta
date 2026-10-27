import { ToastProvider } from "@rotta/ui/web";
import { render as renderCru, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import ImportarRastreadoresPage from "./page";

import type { ReactElement } from "react";

/**
 * Credenciar rastreadores.
 *
 * ## Por que esta tela e não outra do Admin
 *
 * Porque é a porta de entrada do rastreamento inteiro: enquanto o IMEI
 * não estiver aqui, a posição chega na API e é descartada, e o ônibus
 * simplesmente não existe no mapa de nenhuma família. É também uma tela
 * de uso raro, feita para um lote de quarenta aparelhos, o que é o pior
 * caso de regressão: ninguém usa por meses e, quando usa, está com o
 * instalador esperando.
 *
 * O que está guardado aqui é o que a tela PROMETE antes de qualquer
 * mutação acontecer: que o botão não dispara sem transportadora e sem
 * linha, e que o resultado parcial é mostrado linha a linha em vez de
 * virar um "deu erro" genérico. Importar de verdade é problema do
 * backend, que já tem os próprios testes.
 */

const useImportarRastreadores = vi.fn();
const mutate = vi.fn();

vi.mock("@/features/companies/hooks/use-companies", () => ({
  useCompaniesList: () => ({
    data: { items: [{ id: "empresa-1", nomeFantasia: "Viação Maricá" }] },
  }),
}));

vi.mock("@/features/vehicles/hooks/use-vehicles", () => ({
  useImportarRastreadores: () => useImportarRastreadores(),
}));

function render(no: ReactElement) {
  return renderCru(<ToastProvider>{no}</ToastProvider>);
}

beforeEach(() => {
  mutate.mockReset();
  useImportarRastreadores.mockReturnValue({ mutate, isPending: false });
});

describe("antes de colar qualquer coisa", () => {
  it("diz que nenhuma linha foi reconhecida, em vez de ficar em silêncio", () => {
    render(<ImportarRastreadoresPage />);

    expect(screen.getByText("Nenhuma linha reconhecida ainda.")).toBeInTheDocument();
  });

  it("o botão fica desligado: sem transportadora e sem linha não há o que credenciar", () => {
    render(<ImportarRastreadoresPage />);

    expect(screen.getByRole("button", { name: /credenciar lote/i })).toBeDisabled();
  });
});

describe("com a planilha colada", () => {
  it("conta os ônibus reconhecidos e destrava o botão", async () => {
    const usuario = userEvent.setup();
    render(<ImportarRastreadoresPage />);

    await usuario.selectOptions(screen.getByRole("combobox"), "empresa-1");
    await usuario.click(screen.getByRole("textbox"));
    await usuario.paste("412\t863719060123456\n118\t863719060999888");

    expect(screen.getByText("2 ônibus reconhecidos na planilha.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /credenciar lote/i })).toBeEnabled();
  });

  it("não deixa credenciar sem escolher a transportadora", async () => {
    // O IMEI entraria no tenant errado, e a posição daquele ônibus
    // passaria a aparecer para as famílias de outra empresa.
    const usuario = userEvent.setup();
    render(<ImportarRastreadoresPage />);

    await usuario.click(screen.getByRole("textbox"));
    await usuario.paste("412\t863719060123456");

    expect(screen.getByRole("button", { name: /credenciar lote/i })).toBeDisabled();
  });

  it("manda transportadora e linhas para a importação", async () => {
    const usuario = userEvent.setup();
    render(<ImportarRastreadoresPage />);

    await usuario.selectOptions(screen.getByRole("combobox"), "empresa-1");
    await usuario.click(screen.getByRole("textbox"));
    await usuario.paste("412\t863719060123456");
    await usuario.click(screen.getByRole("button", { name: /credenciar lote/i }));

    expect(mutate).toHaveBeenCalledTimes(1);
    expect(mutate.mock.calls[0]?.[0]).toMatchObject({ companyId: "empresa-1" });
    expect(mutate.mock.calls[0]?.[0].itens).toHaveLength(1);
  });
});

describe("quando parte do lote é recusada", () => {
  it("mostra linha, ônibus e motivo de cada recusa, sem perder o que entrou", async () => {
    // O resultado parcial é o ponto da tela: uma linha com IMEI
    // repetido não pode derrubar as outras trinta e nove.
    mutate.mockImplementation((_entrada, opcoes) =>
      opcoes.onSuccess({
        total: 2,
        credenciados: 1,
        recusadas: [{ linha: 2, identificador: "118", motivo: "IMEI já usado em outro ônibus" }],
      }),
    );
    const usuario = userEvent.setup();
    render(<ImportarRastreadoresPage />);

    await usuario.selectOptions(screen.getByRole("combobox"), "empresa-1");
    await usuario.click(screen.getByRole("textbox"));
    await usuario.paste("412\t863719060123456\n118\t863719060123456");
    await usuario.click(screen.getByRole("button", { name: /credenciar lote/i }));

    expect(screen.getByText("1 de 2 credenciados")).toBeInTheDocument();
    expect(screen.getByText("IMEI já usado em outro ônibus")).toBeInTheDocument();
    expect(screen.getByText(/Corrija só elas e cole de novo/)).toBeInTheDocument();
  });

  it("lote inteiro aceito diz isso com todas as letras", async () => {
    mutate.mockImplementation((_entrada, opcoes) =>
      opcoes.onSuccess({ total: 1, credenciados: 1, recusadas: [] }),
    );
    const usuario = userEvent.setup();
    render(<ImportarRastreadoresPage />);

    await usuario.selectOptions(screen.getByRole("combobox"), "empresa-1");
    await usuario.click(screen.getByRole("textbox"));
    await usuario.paste("412\t863719060123456");
    await usuario.click(screen.getByRole("button", { name: /credenciar lote/i }));

    expect(
      screen.getByText("Todos os ônibus da planilha ficaram com rastreador credenciado."),
    ).toBeInTheDocument();
  });
});
