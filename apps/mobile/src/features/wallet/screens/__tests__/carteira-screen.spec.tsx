import { fireEvent, render, screen } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ThemeProvider } from "@/providers/theme-provider";

/*
  A tela desenha o próprio cabeçalho azul, que encosta na barra de
  status e traz a seta de voltar: ela precisa do recuo do topo e da
  navegação. No teste os dois são dublês — medida de tela e pilha de
  navegação real não cabem aqui, e não é isso que estes testes afirmam.
*/
jest.mock("@react-navigation/native", () => ({
  useNavigation: () => ({ goBack: jest.fn() }),
}));

jest.mock("@rotta/auth/native", () => ({
  useAuth: () => ({ user: { nome: "Carlos Silva" } }),
}));

const RECUO = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, bottom: 34, left: 0, right: 0 },
};

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
  /* A conta de recebimento entrou em 20/10/2026. `null` é o estado de
     toda transportadora cadastrada antes dela, e por isso é o padrão
     dos testes que já existiam. */
  conta: { data: null as unknown },
  /* Dentro de `mocks` porque a fábrica de `jest.mock` é içada para
     antes das declarações do arquivo, e só nomes começando com "mock"
     podem ser lidos de dentro dela. */
  criarSubconta: jest.fn().mockResolvedValue({}),
};

jest.mock("../../hooks/use-wallet", () => ({
  useMyWallet: () => mocks.wallet,
  useMyWalletTransactions: () => mocks.transacoes,
  useMyWithdrawalRequests: () => mocks.saques,
  useRequestWithdrawal: () => ({ mutateAsync: jest.fn(), isPending: false }),
}));

jest.mock("../../hooks/use-conta-de-recebimento", () => ({
  useContaDeRecebimento: () => mocks.conta,
  useCriarSubcontaAsaas: () => ({ mutateAsync: mocks.criarSubconta, isPending: false }),
}));

// eslint-disable-next-line import/first -- o mock precisa existir antes do import da tela.
import { CarteiraScreen } from "../carteira-screen";

function montar() {
  return render(
    <SafeAreaProvider initialMetrics={RECUO}>
      <ThemeProvider>
        <CarteiraScreen />
      </ThemeProvider>
    </SafeAreaProvider>,
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

  /*
    A conta de recebimento é o que decide por onde o dinheiro da família
    passa. Dois erros aqui não são de layout:

    1. **Oferecer abrir a segunda conta.** A chave de acesso só aparece
       na criação e não tem segunda chance: a primeira ficaria perdida.
       A API recusa, e a tela não pode nem oferecer.
    2. **Prometer saldo que não vai aparecer.** Com o repasse direto
       ativo, a mensalidade não passa mais pelo Rotta Pay, e dizer que
       "fica aqui até a confirmação" seria mandar a pessoa esperar um
       saldo que nunca chega.
  */
  describe("conta de recebimento", () => {
    afterEach(() => {
      mocks.conta = { data: null };
      mocks.criarSubconta.mockClear();
    });

    it("sem conta aberta, o formulário pede um campo e diz onde o dinheiro cai hoje", () => {
      montar();

      expect(screen.getByText("Conta não aberta")).toBeTruthy();
      expect(screen.getByLabelText("Faturamento mensal")).toBeTruthy();
      expect(screen.getByText("Abrir conta")).toBeTruthy();
    });

    it("abre a conta com o faturamento em centavos, lido da notação brasileira", () => {
      montar();

      fireEvent.changeText(screen.getByLabelText("Faturamento mensal"), "4.500,00");
      fireEvent.press(screen.getByText("Abrir conta"));

      expect(mocks.criarSubconta).toHaveBeenCalledWith({ faturamentoMensalCentavos: 450_000 });
    });

    it("sem valor legível, recusa na tela e não chama a API", () => {
      montar();

      fireEvent.changeText(screen.getByLabelText("Faturamento mensal"), "abc");
      fireEvent.press(screen.getByText("Abrir conta"));

      expect(mocks.criarSubconta).not.toHaveBeenCalled();
      expect(screen.getByText(/Informe o faturamento mensal/)).toBeTruthy();
    });

    it("em análise, não oferece abrir de novo", () => {
      mocks.conta = {
        data: {
          id: "conta-1",
          status: "EM_ANALISE",
          asaasAccountId: "acc_1",
          asaasWalletId: "wallet_1",
          asaasOnboardingUrl: null,
        },
      };
      montar();

      expect(screen.getByText("Em análise")).toBeTruthy();
      expect(screen.queryByText("Abrir conta")).toBeNull();
      expect(screen.queryByLabelText("Faturamento mensal")).toBeNull();
    });

    it("com repasse direto, o pendente deixa de prometer a mensalidade", () => {
      mocks.conta = {
        data: {
          id: "conta-1",
          status: "ATIVA",
          asaasAccountId: "acc_1",
          asaasWalletId: "wallet_1",
          asaasOnboardingUrl: null,
        },
      };
      montar();

      expect(screen.getByText("Recebendo direto")).toBeTruthy();
      expect(screen.getByText(/vão direto para a sua conta de recebimento/)).toBeTruthy();
      expect(screen.queryByText(/ficam aqui até a confirmação/)).toBeNull();
    });
  });
});
