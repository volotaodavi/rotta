import { StyleSheet, View, type ViewProps } from "react-native";

import type { Theme } from "@rotta/theme";

/**
 * ContentSheet — a folha branca que sobe por cima do topo azul.
 *
 * A segunda metade do `AccountHeader`. No conceito visual de
 * 16/10/2026, o conteúdo da tela de conta não começa abaixo do azul:
 * ele sobe por cima dele, com os cantos de cima arredondados, como uma
 * folha de papel colocada sobre a mesa.
 *
 * Existe como componente, e não como estilo solto na tela, porque a
 * sobreposição precisa casar exatamente com o `sobreposicaoDaFolha` do
 * cabeçalho: um ponto de diferença entre os dois deixa aparecer uma
 * fresta do azul, ou um corte reto no meio do arredondado.
 */
export interface ContentSheetProps extends ViewProps {
  /** Precisa ser o mesmo valor passado ao `AccountHeader`. */
  sobreposicao?: number;
  theme: Theme;
}

export function ContentSheet({
  sobreposicao = 24,
  theme,
  style,
  children,
  ...rest
}: ContentSheetProps): JSX.Element {
  return (
    <View
      style={[
        styles.folha,
        {
          backgroundColor: theme.colors.background,
          borderTopLeftRadius: theme.radius.xl,
          borderTopRightRadius: theme.radius.xl,
          gap: theme.spacing[4],
          marginTop: -sobreposicao,
          padding: theme.spacing[4],
        },
        style,
      ]}
      {...rest}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  folha: {
    flexGrow: 1,
  },
});
