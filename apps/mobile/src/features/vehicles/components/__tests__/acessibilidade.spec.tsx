import { render, screen } from "@testing-library/react-native";

import { VehicleButton } from "../vehicle-button";
import { VehicleTextField } from "../vehicle-text-field";

import { ThemeProvider } from "@/providers/theme-provider";

/**
 * Acessibilidade do campo e do botão compartilhados.
 *
 * ## Por que isto é teste, e não revisão
 *
 * Porque estes dois componentes são a base de TODO formulário e de todo
 * botão do app: 14 features importam daqui. Um defeito de
 * acessibilidade aqui não é um defeito numa tela, é o mesmo defeito em
 * dezenas, e ninguém percebe olhando, porque na tela está tudo escrito
 * e bonito. Só aparece para quem usa leitor de tela, que é justamente
 * quem não vai reclamar num grupo de WhatsApp.
 *
 * E tem o lado medido: o funil da Rotta morre no formulário, com 3
 * checkouts iniciados e 3 abandonados. Formulário cujos campos não se
 * anunciam é um candidato honesto a parte da explicação.
 */

describe("VehicleTextField", () => {
  it("o campo carrega o próprio rótulo para o leitor de tela", () => {
    /*
      O rótulo visível é um `Text` solto ao lado do input. Sem
      `accessibilityLabel`, o leitor de tela anuncia "campo de edição" e
      mais nada, em todos os campos do formulário.
    */
    render(
      <ThemeProvider>
        <VehicleTextField label="CPF do responsável" />
      </ThemeProvider>,
    );

    expect(screen.getByLabelText("CPF do responsável")).toBeTruthy();
  });
});

describe("VehicleButton", () => {
  it("anuncia que está desabilitado", () => {
    render(
      <ThemeProvider>
        <VehicleButton label="Salvar" onPress={jest.fn()} disabled />
      </ThemeProvider>,
    );

    expect(screen.getByLabelText("Salvar").props.accessibilityState.disabled).toBe(true);
  });

  it("mantém o rótulo durante o carregamento, quando o texto some da tela", () => {
    /*
      Carregando, o botão troca o texto por um indicador girando. Sem
      `accessibilityLabel`, não sobra nada para anunciar: a pessoa ouve
      "botão" e não sabe se apertou, se funcionou, nem o que era.
    */
    render(
      <ThemeProvider>
        <VehicleButton label="Iniciar viagem" onPress={jest.fn()} isLoading />
      </ThemeProvider>,
    );

    const botao = screen.getByLabelText("Iniciar viagem");
    expect(botao.props.accessibilityState.busy).toBe(true);
    expect(botao.props.accessibilityState.disabled).toBe(true);
  });
});
