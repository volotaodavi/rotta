import { fireEvent, render, screen } from "@testing-library/react-native";

import { ThemeProvider } from "@/providers/theme-provider";

/**
 * A carteira Rotta Pay do transportador.
 *
 * ## O que estes testes protegem
 *
 * Esta é a tela de dinheiro de quem roda a van, e ela fica aberta no
 * suporte do painel a viagem inteira, com passageiro atrás e gente ao
 * lado na escola. Dois riscos aqui não são de layout:
 *
 * 1. **Saldo exposto.** Se o olho não esconder de verdade, a tela vira
 *    um extrato público.
 * 2. **Atalho que promete o que não existe.** Transferir, Pagar e
 *    Cartão dependem de instituição financeira parceira, que não
 *    existe. Se eles disparam, o toque dá erro; se eles somem, a pessoa
 *    procura para sempre.
 *
 * O terceiro teste é sobre o extrato não pintar saída de vermelho:
 * gastar não é erro, e o sinal precisa estar no texto para quem não
 * distingue verde de vermelho.
 */

const mocks = {
  wallet: {
    data: {
      id: "w1",
      saldoDisponivelCentavos: 124_800,
      saldoPendenteCentavos: 66_000,
    },
    isLoading: false,
    isError: false,
  },
  transacoes: {
    data: {
      items: [
        {
          id: "t1",
          tipo: "CREDITO_MENSALIDADE",
          status: "CONCLUIDA",
          valorCentavos: 66_000,
          createdAt: "2026-10-05T12:30:00.000Z",
        },
        {
          id: "t2",
          tipo: "DEBITO_SAQUE",
          status: "CONCLUIDA",
          valorCentavos: 50_000,
          createdAt: "2026-10-06T09:00:00.000Z",
        },
      ],
    },
  },
  saques: { data: [] as unknown[] },
};

jest.mock("../../hooks/use-wallet", () => ({
  useMyWallet: () => mocks.wallet,
  useMyWalletTransactions: () => mocks.transacoes,
  useMyWithdrawalRequests: () => mocks.saques,
  useRequestWithdrawal: () => ({ mutateAsync: jest.fn(), isPending: false }),
}));

// eslint-disable-next-line import/first -- o mock precisa existir antes do import da tela.
import { CarteiraScreen } from "../carteira-screen";

function montar() {
  return render(
    <ThemeProvider>
      <CarteiraScreen />
    </ThemeProvider>,
  );
}

describe("Carteira do transportador", () => {
  it("o saldo pode ser escondido, e volta", () => {
    montar();

    expect(screen.getByText("R$ 1.248,00")).toBeTruthy();

    fireEvent.press(screen.getByLabelText("Esconder saldo"));

    expect(screen.queryByText("R$ 1.248,00")).toBeNull();
    expect(screen.getByLabelText("Saldo oculto")).toBeTruthy();

    fireEvent.press(screen.getByLabelText("Mostrar saldo"));

    expect(screen.getByText("R$ 1.248,00")).toBeTruthy();
  });

  it("saída leva sinal no texto, e não só cor", () => {
    /* Vermelho contra verde é o par que some para quem tem daltonismo,
       e é justamente o par de um extrato. */
    montar();

    expect(screen.getByText("- R$ 500,00")).toBeTruthy();
    expect(screen.getByLabelText("Saída de R$ 500,00")).toBeTruthy();
    expect(screen.getByLabelText("Entrada de R$ 660,00")).toBeTruthy();
  });

  it("o que depende de banco parceiro aparece apagado, com o motivo", () => {
    montar();

    for (const rotulo of ["Transferir", "Pagar", "Cartão"]) {
      const atalho = screen.getByLabelText(`${rotulo}, depende de parceiro bancário`);
      expect(atalho.props.accessibilityState.disabled).toBe(true);
    }
  });

  it("sacar abre o formulário, que é o único atalho que existe hoje", () => {
    montar();

    expect(screen.queryByText("Confirmar saque")).toBeNull();

    fireEvent.press(screen.getByLabelText("Sacar"));

    expect(screen.getByText("Confirmar saque")).toBeTruthy();
    expect(screen.getByLabelText("Chave PIX")).toBeTruthy();
  });

  it("lista vazia de saques vira estado vazio, e não frase solta", () => {
    montar();

    expect(screen.getByText("Nenhum saque solicitado")).toBeTruthy();
  });
});
