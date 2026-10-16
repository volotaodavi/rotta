import { fonteNativa } from "@rotta/theme";
import { Pressable, StyleSheet, Text, View } from "react-native";

import type { Theme } from "@rotta/theme";

/**
 * InfoTile — o bloco com ícone à esquerda e duas linhas de texto.
 *
 * É a peça mais repetida do conceito visual de 16/10/2026: "Pix / copia
 * e cola", "QR Code", "Chave Pix", "Pix recorrente", "Cartão recorrente
 * / Débito e crédito", "Extrato / Ver movimentações", "Comprovantes /
 * Baixar e compartilhar", "Seguros", "Cartão", "Conta digital / Banco
 * Rendimento". Dez ocorrências em duas telas.
 *
 * ## Por que não é o `ActionGrid`
 *
 * O `ActionGrid` é para ação de mesmo peso, quatro por linha, rótulo de
 * uma palavra embaixo do ícone. Quando o rótulo precisa de uma segunda
 * linha para explicar ("copia e cola", "Débito e crédito"), ele não
 * cabe: em 360 pontos de largura, quatro colunas dão menos de 70
 * pontos por rótulo. O conceito resolve exatamente assim, trocando a
 * grade de quatro pela de duas ou três com texto ao lado do ícone.
 *
 * ## `variante="apoio"` não é decoração
 *
 * No conceito, "Extrato" e "Comprovantes" aparecem com fundo cinza
 * enquanto os meios de pagamento aparecem com fundo branco e borda.
 * A diferença diz o que a pessoa veio fazer: pagar é a tarefa, consultar
 * é o apoio. Pintar os dois iguais faria a pessoa procurar o pagamento
 * entre seis blocos idênticos.
 */
export interface InfoTileProps {
  titulo: string;
  /** Segunda linha, menor. Opcional: "QR Code" não precisa explicar. */
  subtitulo?: string;
  /** Ícone já renderizado pela tela: este pacote não escolhe ícone. */
  icon?: JSX.Element;
  onPress?: () => void;
  /** Quando presente, o bloco fica apagado e não dispara. */
  motivoIndisponivel?: string;
  variante?: "principal" | "apoio";
  theme: Theme;
}

export function InfoTile({
  titulo,
  subtitulo,
  icon,
  onPress,
  motivoIndisponivel,
  variante = "principal",
  theme,
}: InfoTileProps): JSX.Element {
  const indisponivel = Boolean(motivoIndisponivel);
  const apoio = variante === "apoio";

  const conteudo = (
    <View style={styles.dentro}>
      {icon ? <View style={styles.icone}>{icon}</View> : null}
      <View style={styles.textos}>
        <Text numberOfLines={1} style={[styles.titulo, { color: theme.colors.text }]}>
          {titulo}
        </Text>
        {subtitulo ? (
          <Text numberOfLines={1} style={[styles.subtitulo, { color: theme.colors.textMuted }]}>
            {subtitulo}
          </Text>
        ) : null}
      </View>
    </View>
  );

  const caixa = [
    styles.bloco,
    {
      backgroundColor: apoio ? theme.colors.surface : theme.colors.card,
      borderColor: apoio ? "transparent" : theme.colors.border,
      borderRadius: theme.radius.lg,
      opacity: indisponivel ? 0.45 : 1,
      paddingHorizontal: theme.spacing[3],
      paddingVertical: theme.spacing[3],
    },
  ];

  if (!onPress) return <View style={caixa}>{conteudo}</View>;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: indisponivel }}
      accessibilityLabel={
        indisponivel
          ? `${titulo}, ${motivoIndisponivel}`
          : subtitulo
            ? `${titulo}, ${subtitulo}`
            : titulo
      }
      disabled={indisponivel}
      onPress={onPress}
      style={({ pressed }) => [...caixa, pressed && !indisponivel ? styles.pressionado : null]}
    >
      {conteudo}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bloco: {
    borderWidth: 1,
    /* 64 pontos: dois blocos lado a lado em 360 de largura ainda dão
       alvo de toque confortável, e a altura fixa impede que um bloco
       com subtítulo fique mais alto que o vizinho sem. */
    minHeight: 64,
    justifyContent: "center",
  },
  pressionado: {
    opacity: 0.7,
  },
  dentro: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
  },
  icone: {
    alignItems: "center",
    justifyContent: "center",
    width: 24,
  },
  textos: {
    flex: 1,
    minWidth: 0,
  },
  titulo: {
    fontFamily: fonteNativa(600),
    fontSize: 13,
  },
  subtitulo: {
    fontFamily: fonteNativa(400),
    fontSize: 11,
    marginTop: 1,
  },
});
