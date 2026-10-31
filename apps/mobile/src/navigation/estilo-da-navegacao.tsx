import { fonteNativa, type Theme } from "@rotta/theme";
import { StyleSheet, View } from "react-native";

import type { BottomTabNavigationOptions } from "@react-navigation/bottom-tabs";
import type { NativeStackNavigationOptions } from "@react-navigation/native-stack";
import type { ReactNode } from "react";

/**
 * A moldura do app: barra de abas e cabeçalho.
 *
 * ## Por que isto não existia, e por que importa tanto
 *
 * Porque a barra de abas e o cabeçalho do React Navigation vêm com um
 * desenho pronto — azul de iOS, cinza de Android, fonte do sistema,
 * uma linha preta de sombra embaixo do título — e o app usava os dois
 * exatamente como vieram, em todas as telas.
 *
 * Essa moldura aparece em cima e embaixo de **tudo**. Enquanto ela for
 * a padrão, qualquer trabalho feito no miolo da tela continua
 * emoldurado por um aplicativo genérico. Foi o que sobrou depois de
 * duas levas de redesenho, e é parte do que o fundador continuava
 * vendo quando dizia que o app tinha "cara de IA".
 *
 * ## O selo da aba ativa
 *
 * No conceito, a aba em que a pessoa está não muda só de cor: o ícone
 * ganha um selo azul preenchido atrás dele. Cor sozinha é fraca como
 * sinal de "você está aqui" numa fileira de cinco ícones pequenos, e
 * some para quem não distingue azul de cinza.
 */

/**
 * Altura da ilha.
 *
 * 64 não é número escolhido no olho: é o `ContainerHeight` do Material
 * 3 (token do Compose, `NavigationBarTokens`). A barra de 80 que o
 * Material usava antes foi aposentada pela própria Google — "the
 * baseline nav bar is no longer recommended... replaced by the flexible
 * nav bar, which is shorter".
 */
const ALTURA_DA_ILHA = 64;

/**
 * Recuo lateral da ilha.
 *
 * O MESMO recuo que o resto do conteúdo da tela usa. É o que faz a
 * ilha alinhar com os cartões em vez de parecer uma peça solta: três
 * recuos diferentes na mesma tela foi exatamente o que o sócio apontou
 * como desproporcional na maquete.
 */
const RECUO_LATERAL = 16;

/** Respiro entre o topo da ilha e o conteúdo que termina acima dela. */
const RESPIRO_ACIMA = 8;

/**
 * A folga entre a ilha e a borda de baixo da tela.
 *
 * Sai da área segura do aparelho, com dois limites. O `- 6` tira o
 * exagero do iPhone com gestos (34 vira 28, que é o que o conceito
 * mede); o `Math.max(..., 10)` garante folga mínima no aparelho antigo
 * sem área segura nenhuma, onde `insets.bottom` é zero e a ilha
 * encostaria na borda.
 *
 * Esta é a conta que, errada, põe coisa encostando na borda — e é
 * justamente a conta que a barra COLADA fazia sozinha, porque o React
 * Navigation cuidava dela. Flutuando, passa a ser nossa.
 */
export function recuoInferiorDaIlha(insetInferior: number): number {
  return Math.max(insetInferior - 6, 10);
}

/**
 * O espaço que a ilha ocupa, de baixo para cima — o que cada tela
 * precisa reservar para o conteúdo não terminar atrás dela.
 */
export function espacoReservadoPelaIlha(insetInferior: number): number {
  return recuoInferiorDaIlha(insetInferior) + ALTURA_DA_ILHA + RESPIRO_ACIMA;
}

/**
 * A barra de abas, agora flutuando.
 *
 * ## Por que flutuar não é enfeite
 *
 * É a diretriz atual das duas plataformas. A Apple, nas Human Interface
 * Guidelines: "A tab bar **floats above content** at the bottom of the
 * screen. Its items rest on a Liquid Glass background that allows
 * content beneath to peek through." O Material 3 aposentou a barra alta
 * e colada em favor de uma mais baixa.
 *
 * ## O preço, e onde ele é pago
 *
 * Com `position: "absolute"` o React Navigation **deixa de reservar o
 * espaço da barra**, e a documentação dele diz isso com todas as
 * letras. Sem compensar, a última linha de toda lista do aplicativo
 * passa a terminar atrás da ilha: a última parada da rota, o último
 * aluno da chamada, o último aviso.
 *
 * O `sceneStyle` daqui é o conserto, e está num lugar só de propósito:
 * ele vale para TODA tela dos quatro navegadores de aba (Responsável,
 * Motorista, Empresa e Admin), inclusive as que ainda não existem.
 * Consertar tela por tela seria consertar dezenas e esquecer a próxima.
 *
 * O resultado é que o conteúdo fica exatamente onde já estava — o que
 * muda é só a moldura. A tela que QUISER o conteúdo passando por baixo
 * do vidro (o mapa de acompanhamento) desliga este respiro na própria
 * aba, explicitamente.
 */
export function opcoesDaBarraDeAbas(
  theme: Theme,
  insetInferior: number,
): BottomTabNavigationOptions {
  return {
    tabBarActiveTintColor: theme.colors.primary,
    tabBarInactiveTintColor: theme.colors.textMuted,
    tabBarStyle: {
      position: "absolute",
      left: RECUO_LATERAL,
      right: RECUO_LATERAL,
      bottom: recuoInferiorDaIlha(insetInferior),
      height: ALTURA_DA_ILHA,
      /* Metade da altura: cápsula. O Material é explícito sobre o canto
         da barra COLADA ser reto (`NavShape: CornerNone`) — arredondar
         só faz sentido depois de descolar, e é o erro mais comum nas
         barras flutuantes por aí: canto redondo encostado na borda. */
      borderRadius: ALTURA_DA_ILHA / 2,
      backgroundColor: theme.colors.card,
      /* A linha de cima sai, a borda inteira entra: um risco reto
         atravessando uma peça de canto redondo fica cortado nas pontas. */
      borderTopWidth: 0,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
      /* Sombra: no Android só sai com `elevation`; no iOS, só com os
         quatro campos de `shadow*`. Precisa dos dois. */
      elevation: 12,
      shadowColor: "#000",
      shadowOpacity: 0.18,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 8 },
      paddingBottom: 6,
      paddingTop: 6,
    },
    sceneStyle: { paddingBottom: espacoReservadoPelaIlha(insetInferior) },
    tabBarLabelStyle: {
      fontFamily: fonteNativa(600),
      fontSize: 11,
      marginTop: 2,
    },
    tabBarBadgeStyle: {
      backgroundColor: theme.colors.danger,
      color: theme.colors.onPrimary,
      fontFamily: fonteNativa(700),
      fontSize: 10,
    },
  };
}

/**
 * O selo azul atrás do ícone da aba ativa.
 *
 * Quem chama passa o ícone já pronto, porque a escolha de ícone é de
 * cada aba — algumas usam SF Symbols no iOS (`RottaSymbol`).
 */
export function SeloDeAba({
  children,
  ativo,
  theme,
}: {
  children: ReactNode;
  ativo: boolean;
  theme: Theme;
}): JSX.Element {
  return (
    <View
      style={[
        styles.selo,
        {
          backgroundColor: ativo ? theme.colors.primary : "transparent",
          /* Totalmente redondo — `CornerFull`, como o Material especifica
             para este indicador. Antes era o raio médio do tema, que
             deixava a pílula com cara de retângulo de cantos cortados. */
          borderRadius: 999,
        },
      ]}
    >
      {children}
    </View>
  );
}

/**
 * O cabeçalho das pilhas de navegação.
 *
 * Sem a linha de sombra (`headerShadowVisible: false`): o conceito
 * separa o cabeçalho do conteúdo por espaço, não por um risco cinza
 * atravessando a tela. E com a letra da marca no título, que é o
 * lugar onde a fonte do sistema mais aparecia.
 */
export function opcoesDoCabecalho(theme: Theme): NativeStackNavigationOptions {
  return {
    headerStyle: { backgroundColor: theme.colors.background },
    headerShadowVisible: false,
    headerTintColor: theme.colors.text,
    headerTitleStyle: {
      color: theme.colors.text,
      fontFamily: fonteNativa(700),
      fontSize: 17,
    },
    headerBackButtonDisplayMode: "minimal",
  };
}

/**
 * O mesmo cabeçalho, para as telas que vivem direto numa aba.
 *
 * Existe separado porque as opções de cabeçalho de uma pilha e de uma
 * aba são tipos diferentes no React Navigation, e só coincidem neste
 * subconjunto. Juntar os dois num objeto só não compila.
 */
export function opcoesDoCabecalhoDeAba(theme: Theme): BottomTabNavigationOptions {
  return {
    headerStyle: { backgroundColor: theme.colors.background },
    headerShadowVisible: false,
    headerTintColor: theme.colors.text,
    headerTitleStyle: {
      color: theme.colors.text,
      fontFamily: fonteNativa(700),
      fontSize: 17,
    },
  };
}

const styles = StyleSheet.create({
  /*
    56 x 32 não é arredondamento: é o `ActiveIndicator` do Material 3
    (tokens `ActiveIndicatorWidth`/`ActiveIndicatorHeight` do Compose),
    e é o indicador oficial de aba ativa de lá.

    A conta de que ele cabe: numa tela de 390 pontos, a ilha tem
    390 - 32 = 358 de largura útil, e cinco abas dão 71,6 cada — a
    pílula de 56 sobra 7,8 de cada lado. No iPhone mais estreito ainda
    em uso (SE, 375 pontos) sobram 4,6. Abaixo de 328 pontos de tela
    ela encostaria, e aí quem encolhe é a pílula, nunca a margem.
  */
  selo: {
    alignItems: "center",
    height: 32,
    justifyContent: "center",
    width: 56,
  },
});
