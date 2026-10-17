import { render, screen } from "@testing-library/react-native";

import { AuthTextField } from "../auth-text-field";

import { ThemeProvider } from "@/providers/theme-provider";

/**
 * A primeira tela do app, para quem usa leitor de tela.
 *
 * ## Por que este teste existe
 *
 * O rótulo de `AuthTextField` é um `Texto` solto acima do campo:
 * visualmente ele etiqueta, e para o TalkBack não etiqueta nada. Sem
 * `accessibilityLabel` no próprio input, quem usa leitor de tela chega
 * na entrada da Rotta e ouve "campo de edição" duas vezes, sem saber
 * qual é o e-mail e qual é a senha.
 *
 * O mesmo conserto foi feito em `VehicleTextField` em 16/10/2026 e
 * passou batido justamente aqui, na tela por onde todo mundo entra.
 * Este teste existe para não passar batido de novo.
 */
describe("Campo do fluxo de entrada", () => {
  it("anuncia o próprio rótulo para o leitor de tela", () => {
    render(
      <ThemeProvider>
        <AuthTextField label="E-mail ou telefone" value="" onChangeText={() => undefined} />
      </ThemeProvider>,
    );

    expect(screen.getByLabelText("E-mail ou telefone")).toBeTruthy();
  });

  it("o rótulo continua visível na tela, e não só no leitor", () => {
    /* Trocar o rótulo visível por `accessibilityLabel` resolveria o
       leitor de tela e quebraria quem enxerga. Os dois existem. */
    render(
      <ThemeProvider>
        <AuthTextField label="Senha" value="" onChangeText={() => undefined} />
      </ThemeProvider>,
    );

    expect(screen.getByText("Senha")).toBeTruthy();
  });
});
