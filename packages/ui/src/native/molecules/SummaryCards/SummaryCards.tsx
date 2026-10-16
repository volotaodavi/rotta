import { fonteNativa } from "@rotta/theme";
import { Pressable, StyleSheet, Text, View } from "react-native";

import type { StatusTone } from "../../atoms/StatusPill";
import type { Theme } from "@rotta/theme";

/**
 * SummaryCards — a faixa de contadores no topo de uma tela.
 *
 * No conceito visual de 16/10/2026 aparece duas vezes, com propósitos
 * diferentes: "Pagas 3 / A vencer 1 / Não pagas 1 / Vencidas 0" no
 * responsável, e "12 Alunos / 18 Rotas" no gestor.
 *
 * ## O contador tem que funcionar bonito com número pequeno
 *
 * A Rotta tinha, em 14/10/2026, 8 alunos na plataforma inteira e 1
 * transportadora pagante. Faixa de números grandes é desenhada para
 * volume e fica constrangedora com dígito único, então aqui o valor não
 * é gigante: ele é forte, e o rótulo embaixo é que carrega o
 * significado. Isso mantém a tela digna com 3 e legível com 3.481.
 *
 * ## Zero não é o mesmo que ausência
 *
 * Um contador em zero continua sendo informação ("Vencidas 0" é boa
 * notícia) e é desenhado com o tom neutro em vez do tom da cor, para
 * não acender vermelho quando não há nada de errado. Quem não tem o
 * número passa `valor: null`, e a célula mostra um traço, nunca zero:
 * fingir zero onde o dado falta é a mentira mais comum de painel.
 */
export interface SummaryCardItem {
  key: string;
  /** Rótulo curto. Em português cabe até cerca de 12 caracteres sem quebrar. */
  label: string;
  /** `null` quando o dado não existe. Zero é um valor legítimo. */
  valor: number | string | null;
  /** Linha de apoio, por exemplo "R$ 1.980,00". */
  detalhe?: string;
  tone?: StatusTone;
  onPress?: () => void;
}

export interface SummaryCardsProps {
  items: SummaryCardItem[];
  theme: Theme;
}

function corDoValor(item: SummaryCardItem, theme: Theme): string {
  if (item.valor === null) return theme.colors.textMuted;
  /* Zero com tom de cor acenderia alerta onde não há alerta. */
  if (item.valor === 0 || item.valor === "0") return theme.colors.text;

  switch (item.tone) {
    case "success":
      return theme.colors.success;
    case "warning":
      return theme.colors.warning;
    case "danger":
      return theme.colors.danger;
    case "info":
      return theme.colors.primary;
    default:
      return theme.colors.text;
  }
}

function fundoDoCard(item: SummaryCardItem, theme: Theme): string {
  if (item.valor === null || item.valor === 0 || item.valor === "0") return theme.colors.surface;

  switch (item.tone) {
    case "success":
      return theme.colors.successMuted;
    case "warning":
      return theme.colors.warningMuted;
    case "danger":
      return theme.colors.dangerMuted;
    case "info":
      return theme.colors.primaryMuted;
    default:
      return theme.colors.surface;
  }
}

export function SummaryCards({ items, theme }: SummaryCardsProps): JSX.Element {
  return (
    <View style={[styles.faixa, { gap: theme.spacing[2] }]}>
      {items.map((item) => {
        const corpo = (
          <View
            style={[
              styles.card,
              {
                backgroundColor: fundoDoCard(item, theme),
                borderRadius: theme.radius.md,
                padding: theme.spacing[3],
              },
            ]}
          >
            {/*
              Rótulo em cima, número embaixo: é a ordem do conceito, e é
              a ordem em que a pergunta chega. A pessoa não olha "3" e
              depois descobre do que; ela procura "Pagas" e lê quantas.
            */}
            <Text numberOfLines={1} style={[styles.rotulo, { color: corDoValor(item, theme) }]}>
              {item.label}
            </Text>
            <Text style={[styles.valor, { color: corDoValor(item, theme) }]}>
              {item.valor === null ? "-" : item.valor}
            </Text>
            {item.detalhe ? (
              <Text numberOfLines={1} style={[styles.detalhe, { color: corDoValor(item, theme) }]}>
                {item.detalhe}
              </Text>
            ) : null}
          </View>
        );

        if (!item.onPress) {
          return (
            <View key={item.key} style={styles.celula}>
              {corpo}
            </View>
          );
        }

        return (
          <Pressable
            key={item.key}
            accessibilityRole="button"
            accessibilityLabel={`${item.label}: ${item.valor === null ? "sem dado" : item.valor}`}
            onPress={item.onPress}
            style={styles.celula}
          >
            {corpo}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  faixa: {
    flexDirection: "row",
  },
  celula: {
    flex: 1,
    /* Sem isto, um rótulo longo estica a célula e as outras encolhem,
       quebrando o alinhamento da faixa inteira. */
    minWidth: 0,
  },
  card: {
    minHeight: 82,
  },
  valor: {
    fontFamily: fonteNativa(700),
    fontSize: 22,
    fontVariant: ["tabular-nums"],
    marginTop: 2,
  },
  rotulo: {
    fontFamily: fonteNativa(600),
    fontSize: 11,
  },
  detalhe: {
    fontFamily: fonteNativa(400),
    fontSize: 10,
    fontVariant: ["tabular-nums"],
    marginTop: 3,
  },
});
