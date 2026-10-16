import { lightTheme } from "@rotta/theme";
import { render, screen } from "@testing-library/react-native";

import { StatusPill } from "../status-pill";

import { ThemeProvider } from "@/providers/theme-provider";

/**
 * A casca que liga o selo antigo ao componente do sistema.
 *
 * ## Por que este teste existe
 *
 * Porque 75 arquivos, em 14 features, importam `StatusPill` daqui. Uma
 * troca silenciosa de implementação embaixo de 75 chamadas é
 * exatamente o tipo de mudança que quebra tela longe de onde foi feita,
 * e ninguém descobre até um usuário abrir aquela tela. O que fica
 * preso aqui é o contrato: o nome, a API e o resultado visível
 * continuam valendo.
 *
 * E prende também a correção que motivou a troca: o fundo agora é token
 * de tema, e não mais a cor da fonte com 15% de opacidade em
 * hexadecimal, que dava resultado sujo no tema escuro.
 */

function montar(tone: "success" | "neutral") {
  return render(
    <ThemeProvider>
      <StatusPill label="Em rota" tone={tone} />
    </ThemeProvider>,
  );
}

function estiloDe(elemento: { props: { style?: unknown } }): Record<string, unknown> {
  const style = elemento.props.style;
  return Array.isArray(style)
    ? (Object.assign({}, ...style.filter(Boolean)) as Record<string, unknown>)
    : ((style ?? {}) as Record<string, unknown>);
}

describe("StatusPill (casca de features/vehicles)", () => {
  it("continua desenhando o rótulo com a mesma API de antes", () => {
    montar("success");
    expect(screen.getByText("Em rota")).toBeTruthy();
  });

  it("o fundo vem do token do tema, não de opacidade em hexadecimal", () => {
    montar("success");

    const estilo = estiloDe(screen.getByLabelText("Em rota"));
    expect(estilo.backgroundColor).toBe(lightTheme.colors.successMuted);
    /* O jeito antigo era a cor da fonte com sufixo de opacidade. */
    expect(estilo.backgroundColor).not.toBe(`${lightTheme.colors.success}26`);
  });

  it("neutral não pinta de cor nenhuma", () => {
    montar("neutral");

    const estilo = estiloDe(screen.getByLabelText("Em rota"));
    expect(estilo.backgroundColor).toBe(lightTheme.colors.surface);
  });
});
