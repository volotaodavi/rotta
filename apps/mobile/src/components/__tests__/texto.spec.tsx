import { fonteNativa } from "@rotta/theme";
import { render, screen } from "@testing-library/react-native";
import { StyleSheet } from "react-native";

import { Texto } from "../texto";

/**
 * A letra da marca em todo o app.
 *
 * ## Por que este teste existe
 *
 * Porque a fonte é uma mudança silenciosa: se `Texto` parar de aplicar
 * a família, nada quebra, nenhuma tela dá erro e nenhum teste falha.
 * O app simplesmente volta a ser Roboto, e ninguém percebe até alguém
 * olhar um print e dizer de novo que está com cara de qualquer
 * aplicativo.
 *
 * O segundo teste é o que importa de verdade: o peso precisa SAIR do
 * estilo. Com fonte própria, deixar `fontWeight` junto faz o Android
 * engrossar por software um arquivo que já é negrito, e o resultado é
 * o borrão que denuncia app mal feito.
 */
function estiloDe(no: ReturnType<typeof screen.getByText>): Record<string, unknown> {
  return StyleSheet.flatten(no.props.style) as Record<string, unknown>;
}

describe("Texto", () => {
  it("usa a família da marca mesmo sem peso declarado", () => {
    render(<Texto>Olá, Mariana!</Texto>);

    expect(estiloDe(screen.getByText("Olá, Mariana!")).fontFamily).toBe(
      "PlusJakartaSans_400Regular",
    );
  });

  it("troca o peso por família, e tira o peso do estilo", () => {
    render(<Texto style={{ fontWeight: "700", fontSize: 20 }}>Saldo disponível</Texto>);

    const estilo = estiloDe(screen.getByText("Saldo disponível"));
    expect(estilo.fontFamily).toBe("PlusJakartaSans_700Bold");
    /* Peso remanescente = negrito sintético por cima do arquivo negrito. */
    expect(estilo.fontWeight).toBeUndefined();
    /* O resto do estilo continua intacto. */
    expect(estilo.fontSize).toBe(20);
  });

  it("respeita a família que o estilo já escolheu, em vez de derivar do peso", () => {
    /*
      Esta é a regra que quase custou a tipografia inteira do sistema de
      design. Todo componente de `@rotta/ui/native` escreve
      `fontFamily: fonteNativa(600)` no `StyleSheet` e NÃO escreve
      `fontWeight`. Se `Texto` derivasse do peso em cima disso, cada
      rótulo em negrito do sistema cairia no 400, porque sem
      `fontWeight` a derivação devolve o regular: o cabeçalho azul da
      carteira, as linhas de movimentação e as abas de filtro viravam
      texto fino de uma vez, sem erro nenhum para avisar.
    */
    render(<Texto style={{ fontFamily: fonteNativa(600) }}>Recebimentos</Texto>);

    expect(estiloDe(screen.getByText("Recebimentos")).fontFamily).toBe(
      "PlusJakartaSans_600SemiBold",
    );
  });

  it("peso que a Rotta não carrega cai no mais próximo, não no regular", () => {
    /* Pedir 900 e receber texto fino seria pior que receber o extrabold. */
    expect(fonteNativa(900)).toBe("PlusJakartaSans_800ExtraBold");
    expect(fonteNativa(100)).toBe("PlusJakartaSans_400Regular");
    expect(fonteNativa("bold")).toBe("PlusJakartaSans_700Bold");
  });
});
