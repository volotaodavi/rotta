import { fireEvent, render, screen } from "@testing-library/react-native";

import { PagamentosScreen } from "../pagamentos-screen";

import type { PagamentosDoResponsavel } from "../../pagamentos-tipos";

import { ThemeProvider } from "@/providers/theme-provider";

/**
 * A tela de Pagamentos do responsável, construída antes do backend.
 *
 * ## O que estes testes protegem
 *
 * Esta é a única tela da Rotta que fala de dinheiro da família, e ela
 * nasce sem fonte de dados: cobrança do responsável não existe no
 * `schema.prisma`. O risco número um aqui não é layout, é a tela
 * preencher sozinha o que não sabe. Quem confere uma fatura confere
 * contra o próprio bolso, e um número errado destrói a confiança no
 * produto inteiro.
 *
 * Por isso o primeiro teste é sobre ausência, e não sobre presença.
 */

const DADOS: PagamentosDoResponsavel = {
  alunoNome: "Lucas Silva",
  resumo: [
    { status: "PAGA", quantidade: 3, totalFormatado: "R$ 1.980,00" },
    { status: "A_VENCER", quantidade: 1, totalFormatado: "R$ 660,00" },
    { status: "VENCIDA", quantidade: 0, totalFormatado: null },
  ],
  faturas: [
    {
      id: "f1",
      competencia: "Abr/2026",
      valorFormatado: "R$ 660,00",
      status: "A_VENCER",
      vencimentoFormatado: "05/04/2026",
    },
    {
      id: "f2",
      competencia: "Mar/2026",
      valorFormatado: "R$ 660,00",
      status: "PAGA",
      vencimentoFormatado: "05/03/2026",
    },
  ],
  totalEmAbertoFormatado: "R$ 660,00",
};

function montar(props: Parameters<typeof PagamentosScreen>[0] = {}) {
  return render(
    <ThemeProvider>
      <PagamentosScreen {...props} />
    </ThemeProvider>,
  );
}

describe("Pagamentos do responsável", () => {
  it("sem dados, diz que não está disponível em vez de inventar fatura", () => {
    montar();

    expect(screen.getByText("Pagamento pelo app ainda não disponível")).toBeTruthy();
    /* Nem fatura de exemplo, nem contador zerado fingindo que há dado. */
    expect(screen.queryByText("Resumo de faturas")).toBeNull();
    expect(screen.queryByText("Pagar agora")).toBeNull();
  });

  it("mostra o valor em aberto dentro do próprio botão", () => {
    /*
      "Pagar agora" sozinho obriga a pessoa a somar de cabeça o que vai
      sair da conta dela. O valor no botão é a diferença entre decidir e
      torcer.
    */
    montar({ dados: DADOS });

    expect(screen.getByText("Pagar agora R$ 660,00")).toBeTruthy();
  });

  it("esconde o botão quando não há nada em aberto", () => {
    /* "Pagar agora" apagado, com tudo em dia, é um susto sem motivo. */
    montar({
      dados: { ...DADOS, totalEmAbertoFormatado: null, faturas: [DADOS.faturas[1]!] },
    });

    expect(screen.queryByText(/Pagar agora/)).toBeNull();
    expect(screen.getByText("Nenhuma fatura em aberto")).toBeTruthy();
  });

  it("o cartão aparece desabilitado, com o motivo, em vez de sumir", () => {
    /*
      O Asaas confirmou em 16/10/2026 que não há SDK nem tokenização
      pelo front: o cartão passaria pelo nosso servidor e colocaria a
      Rotta em escopo PCI DSS. Esconder faria a família procurar para
      sempre; deixar ativo daria erro no toque.
    */
    const escolher = jest.fn();
    montar({ dados: DADOS, onEscolherMeio: escolher });

    const cartao = screen.getByLabelText("Cartão, em avaliação");
    expect(cartao.props.accessibilityState.disabled).toBe(true);
    fireEvent.press(cartao);
    expect(escolher).not.toHaveBeenCalled();
  });

  it("Pix recorrente é o primeiro meio, e funciona", () => {
    const escolher = jest.fn();
    montar({ dados: DADOS, onEscolherMeio: escolher });

    fireEvent.press(screen.getByLabelText("Pix recorrente"));
    expect(escolher).toHaveBeenCalledWith("pix-recorrente");
  });

  it("separa em aberto de pagas, e troca de aba", () => {
    montar({ dados: DADOS });

    expect(screen.getByText("Abr/2026")).toBeTruthy();
    expect(screen.queryByText("Mar/2026")).toBeNull();

    fireEvent.press(screen.getByLabelText("Pagas, 1"));

    expect(screen.getByText("Mar/2026")).toBeTruthy();
    expect(screen.queryByText("Abr/2026")).toBeNull();
  });

  it("grupo sem total conhecido não vira R$ 0,00", () => {
    /* A regra de `empresa/dados/FORMULAS.md`: dado que falta é traço. */
    montar({ dados: DADOS });

    expect(screen.queryByText("R$ 0,00")).toBeNull();
  });
});
