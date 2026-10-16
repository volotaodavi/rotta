import { fonteNativa } from "@rotta/theme";
import { StyleSheet, Text, type TextProps } from "react-native";

/**
 * Todo texto do app, na letra da marca.
 *
 * ## Por que um componente, e não um estilo
 *
 * Porque no React Native com fonte própria o peso não é uma
 * propriedade: cada peso é uma família registrada
 * (`PlusJakartaSans_600SemiBold` e não "Plus Jakarta Sans" + 600).
 * Pedir peso 700 numa família que só tem o regular faz o Android
 * desenhar um negrito sintético, engrossado por software, que é o
 * borrão que denuncia app mal feito.
 *
 * Este componente faz a tradução num lugar só: lê o `fontWeight` que a
 * tela já escreveu, escolhe o arquivo certo e **remove o peso** do
 * estilo final, para o sistema não engrossar por cima de um arquivo
 * que já é negrito.
 *
 * ## Por que todas as telas passaram a usá-lo
 *
 * Porque o app tem mais de cem telas e nenhuma delas tinha fonte: o
 * texto saía em Roboto no Android e SF Pro no iOS. Trocar a letra só
 * nos componentes compartilhados deixaria metade do app numa fonte e
 * metade em outra, que é pior que não ter fonte nenhuma.
 *
 * A troca foi mecânica: `<Text>` virou `<Texto>` em todo o aplicativo.
 * A API é a mesma de `Text` — `numberOfLines`, `selectable`,
 * `accessibilityRole`, tudo continua valendo.
 */
export function Texto({ style, ...resto }: TextProps): JSX.Element {
  const achatado = StyleSheet.flatten(style);
  const { fontWeight, ...semPeso } = achatado ?? {};

  return <Text {...resto} style={[semPeso, { fontFamily: fonteNativa(fontWeight ?? 400) }]} />;
}
