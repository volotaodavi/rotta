import { darkColors, lightColors, type Theme } from "@rotta/theme";
import { StyleSheet } from "react-native";

import {
  espacoReservadoPelaIlha,
  opcoesDaBarraDeAbas,
  recuoInferiorDaIlha,
} from "../estilo-da-navegacao";

import type { ViewStyle } from "react-native";

/**
 * A barra de abas flutuante.
 *
 * ## O que este teste existe para impedir
 *
 * Um defeito e uma regressão, nesta ordem de gravidade.
 *
 * **O defeito:** com `position: "absolute"` o React Navigation deixa de
 * reservar o espaço da barra — está na documentação dele. Sem
 * compensar, a última linha de toda lista do aplicativo passa a
 * terminar atrás da ilha: a última parada da rota, o último aluno da
 * chamada, o último aviso. O `sceneStyle` é o que compensa, e se ele
 * sumir num refactor nada quebra de forma visível — a lista só fica
 * cortada, em todas as telas, de uma vez.
 *
 * **A regressão:** a ilha encostar na borda. Flutuando, a folga de
 * baixo passou a ser conta nossa, e ela depende da área segura do
 * aparelho — que é 34 no iPhone com gestos, perto de zero no Android
 * antigo. Os dois extremos estão travados aqui.
 */

const temaClaro = { colors: lightColors, radius: { md: 12 } } as unknown as Theme;
const temaEscuro = { colors: darkColors, radius: { md: 12 } } as unknown as Theme;

/** `tabBarStyle` é tipado como um `StyleProp` largo; aqui ele é sempre um objeto. */
function barra(theme: Theme, insetInferior: number): ViewStyle {
  return opcoesDaBarraDeAbas(theme, insetInferior).tabBarStyle as ViewStyle;
}

function cena(theme: Theme, insetInferior: number): ViewStyle {
  return opcoesDaBarraDeAbas(theme, insetInferior).sceneStyle as ViewStyle;
}

describe("a ilha flutua", () => {
  it("é absoluta, descolada dos dois lados e do rodapé", () => {
    const estilo = barra(temaClaro, 34);

    expect(estilo.position).toBe("absolute");
    expect(estilo.left).toBe(16);
    expect(estilo.right).toBe(16);
    expect(estilo.bottom).toBeGreaterThan(0);
  });

  it("o canto é metade da altura: cápsula, não retângulo arredondado", () => {
    // O Material é explícito: a barra COLADA tem canto reto
    // (`NavShape: CornerNone`). Arredondar só faz sentido depois de
    // descolar — e pela metade da altura, senão sobra canto reto no meio.
    const estilo = barra(temaClaro, 34);

    expect(estilo.borderRadius).toBe(Number(estilo.height) / 2);
  });

  it("não sobra a linha de cima da barra antiga", () => {
    // Um risco reto atravessando uma peça de canto redondo fica cortado
    // nas pontas. A borda inteira substitui a linha.
    const estilo = barra(temaClaro, 34);

    expect(estilo.borderTopWidth).toBe(0);
    expect(estilo.borderWidth).toBe(StyleSheet.hairlineWidth);
  });

  it("tem sombra nas DUAS plataformas", () => {
    // No Android a sombra só sai com `elevation`; no iOS, só com os
    // campos de `shadow*`. Uma ilha sem sombra não flutua: vira um
    // retângulo claro sobre o conteúdo.
    const estilo = barra(temaEscuro, 34);

    expect(estilo.elevation).toBeGreaterThan(0);
    expect(estilo.shadowOpacity).toBeGreaterThan(0);
    expect(estilo.shadowRadius).toBeGreaterThan(0);
  });

  it("usa a altura do Material 3, não a antiga", () => {
    // 64 = `ContainerHeight`. A de 80 foi aposentada pela própria Google.
    expect(barra(temaClaro, 34).height).toBe(64);
  });
});

describe("a folga até a borda de baixo", () => {
  it("no iPhone com gestos, fica acima da barra de gestos", () => {
    // Área segura de 34 no iPhone com Dynamic Island.
    expect(recuoInferiorDaIlha(34)).toBe(28);
  });

  it("no aparelho SEM área segura, ainda sobra folga", () => {
    // É este o caso que põe a ilha encostando na borda quando se
    // esquece do piso: `insets.bottom` vem zero.
    expect(recuoInferiorDaIlha(0)).toBeGreaterThanOrEqual(10);
  });

  it("nunca é negativa, nem com área segura minúscula", () => {
    for (const inset of [0, 2, 5, 8, 16, 20, 34, 48]) {
      expect(recuoInferiorDaIlha(inset)).toBeGreaterThan(0);
    }
  });
});

describe("o espaço que o conteúdo reserva", () => {
  it("é maior que a ilha inteira — senão a última linha some atrás dela", () => {
    // ESTE é o teste do defeito. `espacoReservadoPelaIlha` precisa
    // cobrir a altura da barra MAIS a folga de baixo, com respiro.
    for (const inset of [0, 16, 34]) {
      const altura = Number(barra(temaClaro, inset).height);
      const reservado = espacoReservadoPelaIlha(inset);

      expect(reservado).toBeGreaterThan(altura + recuoInferiorDaIlha(inset));
    }
  });

  it("chega às telas pelo `sceneStyle`, num lugar só", () => {
    // Num lugar só de propósito: vale para toda tela dos quatro
    // navegadores de aba, inclusive as que ainda não existem. Consertar
    // tela por tela seria consertar dezenas e esquecer a próxima.
    expect(cena(temaClaro, 34).paddingBottom).toBe(espacoReservadoPelaIlha(34));
  });

  it("cresce junto com a área segura do aparelho", () => {
    expect(espacoReservadoPelaIlha(34)).toBeGreaterThan(espacoReservadoPelaIlha(0));
  });
});

describe("as cores saem do tema, nos dois modos", () => {
  it.each([
    ["claro", temaClaro, lightColors],
    ["escuro", temaEscuro, darkColors],
  ] as const)("tema %s", (_nome, tema, cores) => {
    const estilo = barra(tema, 34);

    expect(estilo.backgroundColor).toBe(cores.card);
    expect(estilo.borderColor).toBe(cores.border);
  });
});
