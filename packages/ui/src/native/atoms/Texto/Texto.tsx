import { fonteNativa } from "@rotta/theme";
import { StyleSheet, Text, type TextProps } from "react-native";

/**
 * Todo texto do aplicativo, na letra da marca.
 *
 * ## Por que um componente, e não um estilo
 *
 * Porque no React Native com fonte própria o peso não é uma
 * propriedade: cada peso é uma família registrada
 * (`PlusJakartaSans_600SemiBold`, e não "Plus Jakarta Sans" + 600).
 * Pedir peso 700 numa família que só tem o regular faz o Android
 * desenhar um negrito sintético, engrossado por software, que é o
 * borrão que denuncia aplicativo mal feito.
 *
 * Este componente faz a tradução num lugar só: lê o `fontWeight` que
 * quem chama já escreveu, escolhe o arquivo certo e **remove o peso**
 * do estilo final, para o sistema não engrossar por cima de um arquivo
 * que já é negrito.
 *
 * ## Por que mora no pacote, e não no aplicativo
 *
 * Porque morava no aplicativo, e o resultado foi exatamente o que a
 * própria documentação dele dizia que não podia acontecer: as telas
 * trocaram de letra e os componentes compartilhados não. O cabeçalho
 * azul da carteira, as linhas de movimentação, as abas de filtro e as
 * etiquetas de estado continuaram em Roboto no Android e SF Pro no
 * iOS, dentro de telas em Plus Jakarta Sans. Metade do aplicativo numa
 * fonte e metade em outra é pior que não ter fonte nenhuma, e era o
 * que estava no ar.
 *
 * Com o componente aqui, qualquer coisa desenhada por `@rotta/ui/native`
 * nasce na letra certa, e o `Texto` do aplicativo é este mesmo.
 *
 * ## Quem já escolheu a família manda
 *
 * Os componentes deste pacote escrevem `fontFamily: fonteNativa(600)`
 * direto no `StyleSheet` e **não** escrevem `fontWeight` nenhum. Se
 * este componente derivasse a família do peso em cima disso, todo
 * rótulo em negrito do sistema de design viraria regular, porque sem
 * `fontWeight` a derivação cai no 400. Então a regra é: família
 * explícita no estilo vence, e a derivação por peso só entra quando
 * ninguém escolheu família — que é o caso das telas do aplicativo,
 * escritas com `fontWeight`.
 *
 * A API é a de `Text`: `numberOfLines`, `selectable`,
 * `accessibilityRole`, tudo continua valendo.
 */
export function Texto({ style, ...resto }: TextProps): JSX.Element {
  const achatado = StyleSheet.flatten(style);
  const { fontWeight, fontFamily, ...semPeso } = achatado ?? {};

  return (
    <Text
      {...resto}
      style={[semPeso, { fontFamily: fontFamily ?? fonteNativa(fontWeight ?? 400) }]}
    />
  );
}
