import { lightTheme } from "@rotta/theme";
import { ActionGrid, BalanceCard, MovementRow, SummaryCards } from "@rotta/ui/native";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { View } from "react-native";

/**
 * A segunda leva de componentes, a da área financeira.
 *
 * Eles vêm do conceito visual de 16/10/2026, e o que estes testes
 * prendem são as quatro regras que separam um extrato confiável de um
 * painel bonito que mente:
 *
 * 1. Saldo pode ser escondido, porque o app fica aberto no suporte da
 *    van com gente do lado.
 * 2. Ação que o produto não tem aparece apagada e explicada, nunca
 *    ativa dando erro, nem some.
 * 3. Entrada e saída se distinguem pelo SINAL, não só pela cor.
 * 4. Dado que falta vira traço, nunca zero.
 */

const theme = lightTheme;
const icone = <View testID="icone" />;

describe("BalanceCard", () => {
  it("esconde o valor quando a pessoa pede", () => {
    const { rerender } = render(
      <BalanceCard
        label="Saldo disponível"
        valorFormatado="R$ 12.480,50"
        visivel
        onAlternarVisibilidade={jest.fn()}
        theme={theme}
      />,
    );
    expect(screen.getByText("R$ 12.480,50")).toBeTruthy();

    rerender(
      <BalanceCard
        label="Saldo disponível"
        valorFormatado="R$ 12.480,50"
        visivel={false}
        onAlternarVisibilidade={jest.fn()}
        theme={theme}
      />,
    );
    expect(screen.queryByText("R$ 12.480,50")).toBeNull();
    expect(screen.getByLabelText("Saldo oculto")).toBeTruthy();
  });

  it("alterna a visibilidade pelo botão", () => {
    const alternar = jest.fn();
    render(
      <BalanceCard
        label="Saldo disponível"
        valorFormatado="R$ 10,00"
        visivel
        onAlternarVisibilidade={alternar}
        theme={theme}
      />,
    );

    fireEvent.press(screen.getByLabelText("Esconder saldo"));
    expect(alternar).toHaveBeenCalledTimes(1);
  });
});

describe("ActionGrid", () => {
  it("ação indisponível não dispara, e diz o motivo", () => {
    /*
      Transferência e pagamento de conta não existem no produto: dependem
      de instituição financeira. Esconder faria a pessoa procurar para
      sempre; deixar ativa daria erro no toque.
    */
    const aoTocar = jest.fn();
    render(
      <ActionGrid
        items={[
          { key: "receber", label: "Receber", icon: icone, onPress: jest.fn() },
          {
            key: "transferir",
            label: "Transferir",
            icon: icone,
            onPress: aoTocar,
            motivoIndisponivel: "em breve",
          },
        ]}
        theme={theme}
      />,
    );

    const botao = screen.getByLabelText("Transferir, em breve");
    expect(botao.props.accessibilityState.disabled).toBe(true);
    fireEvent.press(botao);
    expect(aoTocar).not.toHaveBeenCalled();
  });
});

describe("MovementRow", () => {
  it("saída leva o sinal no texto, não só a cor", () => {
    /*
      Cerca de um em cada doze homens tem daltonismo, e verde contra
      vermelho é o par que some. Sinal no texto é o que sobra.
    */
    render(
      <MovementRow
        titulo="Pagamento de combustível"
        valorFormatado="R$ 250,00"
        direcao="saida"
        theme={theme}
      />,
    );

    expect(screen.getByText("- R$ 250,00")).toBeTruthy();
  });

  it("entrada não leva sinal e é anunciada como entrada", () => {
    render(
      <MovementRow
        titulo="Recebimento"
        valorFormatado="R$ 660,00"
        direcao="entrada"
        data="05/04/2026"
        theme={theme}
      />,
    );

    expect(screen.getByText("R$ 660,00")).toBeTruthy();
    expect(screen.getByLabelText("Entrada de R$ 660,00")).toBeTruthy();
    expect(screen.getByText("05/04/2026")).toBeTruthy();
  });
});

describe("SummaryCards", () => {
  it("dado que falta vira traço, nunca zero", () => {
    /*
      Preencher com zero o que não se sabe é a mentira mais comum de
      painel, e a regra escrita em empresa/dados/FORMULAS.md.
    */
    render(
      <SummaryCards
        items={[
          { key: "a", label: "Pagas", valor: 3, tone: "success" },
          { key: "b", label: "Receita", valor: null },
        ]}
        theme={theme}
      />,
    );

    expect(screen.getByText("3")).toBeTruthy();
    expect(screen.getByText("-")).toBeTruthy();
    expect(screen.queryByText("0")).toBeNull();
  });

  it("zero é informação e não acende alerta", () => {
    render(
      <SummaryCards
        items={[{ key: "v", label: "Vencidas", valor: 0, tone: "danger" }]}
        theme={theme}
      />,
    );

    const valor = screen.getByText("0");
    const estilo = Array.isArray(valor.props.style)
      ? Object.assign({}, ...valor.props.style.filter(Boolean))
      : valor.props.style;
    expect(estilo.color).toBe(theme.colors.text);
    expect(estilo.color).not.toBe(theme.colors.danger);
  });
});
