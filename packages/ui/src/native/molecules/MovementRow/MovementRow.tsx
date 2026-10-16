import { Pressable, StyleSheet, Text, View } from "react-native";

import type { Theme } from "@rotta/theme";

/**
 * MovementRow — a linha de movimentação de dinheiro.
 *
 * "Recebimento Mensalidade, R$ 660,00, 05/04" e "Pagamento de
 * combustível, menos R$ 250,00" na área financeira do conceito de
 * 16/10/2026. Também serve para a linha de fatura do responsável, que
 * tem a mesma anatomia: o que é, de quando é, e quanto.
 *
 * ## Entrada e saída se distinguem por sinal E por cor
 *
 * Só cor não basta: cerca de um em cada doze homens tem alguma forma de
 * daltonismo, e vermelho contra verde é justamente o par que some. Por
 * isso o sinal vem no texto ("-" explícito na saída) e a cor é reforço,
 * nunca a única informação. Entrada fica verde; saída fica no texto
 * comum, não em vermelho, porque gastar não é erro e pintar toda
 * despesa de vermelho faz um extrato saudável parecer um desastre.
 *
 * ## Valor e data alinhados por dígito
 *
 * `fontVariant: tabular-nums` nos dois. Sem isso, numa lista de dez
 * linhas, os centavos dançam de uma linha para a outra e o olho perde a
 * coluna, que é exatamente o que um extrato não pode fazer.
 */
export interface MovementRowProps {
  titulo: string;
  /** Linha de apoio: origem, categoria, nome de quem pagou. */
  subtitulo?: string;
  /** Já formatado e sem sinal, por exemplo "R$ 660,00". */
  valorFormatado: string;
  direcao: "entrada" | "saida";
  /** Já formatada pela tela, por exemplo "05/04/2026". */
  data?: string;
  /** Ícone já renderizado pela tela. */
  icon?: JSX.Element;
  onPress?: () => void;
  theme: Theme;
}

export function MovementRow({
  titulo,
  subtitulo,
  valorFormatado,
  direcao,
  data,
  icon,
  onPress,
  theme,
}: MovementRowProps): JSX.Element {
  const entrada = direcao === "entrada";
  const valorComSinal = entrada ? valorFormatado : `- ${valorFormatado}`;

  const conteudo = (
    <View style={[styles.linha, { paddingVertical: theme.spacing[3] }]}>
      {icon ? (
        <View
          style={[
            styles.icone,
            {
              /* Entrada verde, saída azul: no conceito a saída não é
                 cinza nem vermelha. Cinza faria a linha parecer
                 desligada, vermelho faria gastar parecer erro. */
              backgroundColor: entrada ? theme.colors.successMuted : theme.colors.primaryMuted,
              borderRadius: theme.radius.full,
            },
          ]}
        >
          {icon}
        </View>
      ) : null}

      <View style={styles.meio}>
        <Text numberOfLines={1} style={[styles.titulo, { color: theme.colors.text }]}>
          {titulo}
        </Text>
        {subtitulo ? (
          <Text numberOfLines={1} style={[styles.subtitulo, { color: theme.colors.textMuted }]}>
            {subtitulo}
          </Text>
        ) : null}
      </View>

      <View style={styles.direita}>
        <Text
          accessibilityLabel={`${entrada ? "Entrada" : "Saída"} de ${valorFormatado}`}
          numberOfLines={1}
          style={[styles.valor, { color: entrada ? theme.colors.success : theme.colors.text }]}
        >
          {valorComSinal}
        </Text>
        {data ? <Text style={[styles.data, { color: theme.colors.textMuted }]}>{data}</Text> : null}
      </View>
    </View>
  );

  if (!onPress) return conteudo;

  return (
    <Pressable accessibilityRole="button" accessibilityLabel={titulo} onPress={onPress}>
      {conteudo}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  linha: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
  },
  icone: {
    alignItems: "center",
    height: 38,
    justifyContent: "center",
    width: 38,
  },
  meio: {
    flex: 1,
    minWidth: 0,
  },
  titulo: {
    fontSize: 14,
    fontWeight: "600",
  },
  subtitulo: {
    fontSize: 12,
    marginTop: 2,
  },
  direita: {
    alignItems: "flex-end",
  },
  valor: {
    fontSize: 14,
    fontVariant: ["tabular-nums"],
    fontWeight: "700",
  },
  data: {
    fontSize: 11,
    fontVariant: ["tabular-nums"],
    marginTop: 2,
  },
});
