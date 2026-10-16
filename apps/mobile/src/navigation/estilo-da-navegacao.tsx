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
export function opcoesDaBarraDeAbas(theme: Theme): BottomTabNavigationOptions {
  return {
    tabBarActiveTintColor: theme.colors.primary,
    tabBarInactiveTintColor: theme.colors.textMuted,
    tabBarStyle: {
      backgroundColor: theme.colors.card,
      borderTopColor: theme.colors.hairline,
      borderTopWidth: StyleSheet.hairlineWidth,
      /* 64 pontos mais a área segura: a barra do conceito é alta e
         arejada, não a faixa apertada do padrão. */
      height: 64,
      paddingBottom: 8,
      paddingTop: 6,
    },
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
          borderRadius: theme.radius.md,
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
  selo: {
    alignItems: "center",
    height: 32,
    justifyContent: "center",
    width: 42,
  },
});
