import { Image, StyleSheet, View } from "react-native";

/* eslint-disable @typescript-eslint/no-require-imports -- `require` é a forma padrão de referenciar um asset estático de imagem no Metro/React Native. */
const WORDMARK_CLARO = require("../../assets/rotta-wordmark-claro.png");
const WORDMARK_ESCURO = require("../../assets/rotta-wordmark.png");
const MARK = require("../../assets/splash-icon.png");
/* eslint-enable @typescript-eslint/no-require-imports */

/** Proporção do arquivo da assinatura (509x154), pra largura sair do tamanho pedido sem distorcer. */
const PROPORCAO_DA_ASSINATURA = 509 / 154;

export type RottaLogoVariant = "mark" | "full";

/**
 * Símbolo "R" da Rotta (Seção 15) — reaproveita o PNG real já usado na
 * splash nativa do Expo (`assets/splash-icon.png`, transparente,
 * recortado do logotipo original enviado pelo usuário — mesma fonte de
 * `apps/web/public/brand/rotta-mark*.png`, ver `app.config.ts`). Nunca
 * redesenhado: é literalmente o mesmo arquivo, só outro tamanho de
 * renderização.
 *
 * `variant="full"` mostra a ASSINATURA oficial, e não mais o texto
 * "ROTTA" digitado na fonte da interface. São dois arquivos, os mesmos
 * que o site usa: `rotta-wordmark.png` (letras pretas, para fundo
 * claro) e `rotta-wordmark-claro.png` (letras brancas, para fundo
 * escuro ou azul, como a splash). `tom` escolhe entre os dois — pintar
 * um PNG por cima não é possível, e seria errado de qualquer forma: o
 * ponto é azul nos dois.
 *
 * O texto digitado estava aqui com uma justificativa que não se
 * sustenta: a de que usar a tipografia do Design System preserva a
 * consistência da marca. Não preserva. A assinatura da Rotta é "Rotta"
 * em caixa mista, numa geométrica arredondada própria, e com o ponto
 * azul à esquerda do "R". O que o app desenhava era "ROTTA" em caixa
 * alta, com espaçamento entre letras e sem o ponto: outra palavra,
 * outra letra, outro desenho. Logotipo não se aproxima com a fonte
 * que estiver à mão, se usa o arquivo.
 */
export function RottaLogo({
  size = 96,
  variant = "mark",
  tom = "escuro",
}: {
  size?: number;
  variant?: RottaLogoVariant;
  /** `claro` = letras brancas, para fundo azul/escuro (splash). */
  tom?: "escuro" | "claro";
}): JSX.Element {
  return (
    <View style={styles.container}>
      <Image source={MARK} style={{ width: size, height: size }} resizeMode="contain" />
      {variant === "full" ? (
        <Image
          source={tom === "claro" ? WORDMARK_CLARO : WORDMARK_ESCURO}
          style={{
            height: size * 0.34,
            marginTop: size * 0.16,
            width: size * 0.34 * PROPORCAO_DA_ASSINATURA,
          }}
          resizeMode="contain"
          accessibilityRole="image"
          accessibilityLabel="Rotta"
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: "center" },
});
