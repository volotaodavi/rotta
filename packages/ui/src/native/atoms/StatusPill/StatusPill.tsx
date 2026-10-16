import { StyleSheet, Text, View } from "react-native";

import type { Theme } from "@rotta/theme";

/**
 * StatusPill — a etiqueta de estado, em um lugar só.
 *
 * ## Por que existe
 *
 * O app tem 94 telas e, até aqui, duas delas compartilhavam componente.
 * Etiqueta de estado aparece em quase todas: aluno embarcado, veículo em
 * manutenção, empresa inadimplente, contrato assinado, viagem em
 * andamento. Cada tela desenhava a sua, com o próprio raio, o próprio
 * espaçamento e a própria decisão de cor. Noventa e quatro
 * interpretações do mesmo elemento é o que faz um aplicativo parecer
 * montado por pessoas diferentes.
 *
 * ## O tom NUNCA é escolhido pela tela no olho
 *
 * Quem chama passa o `tone` derivado de um enum real do backend, e os
 * mapeamentos verdadeiros de hoje são estes:
 *
 * - `TripStudentEventType`: EMBARCOU → success, DESEMBARCOU → info,
 *   AUSENTE → danger.
 * - `CompanyStatus`: ATIVO → success, TRIAL → info, INADIMPLENTE →
 *   warning, SUSPENSO e CANCELADO → danger.
 * - `TripStatus`: EM_ANDAMENTO → info, FINALIZADA → success, PAUSADA →
 *   warning, CANCELADA → danger.
 *
 * Status de fatura do responsável (pago, a vencer, vencido) aparece no
 * conceito visual de 16/10/2026 e **não existe no backend**: cobrança da
 * família não foi implementada. Quando existir, o mapeamento entra aqui
 * em cima, e não numa tela.
 *
 * `neutral` existe para rótulo que não é estado, como "Todos" ou uma
 * contagem. Usar `neutral` para esconder um estado ruim é mentira
 * visual, e é o único uso proibido deste componente.
 */
export type StatusTone = "success" | "warning" | "danger" | "info" | "neutral";

export interface StatusPillProps {
  label: string;
  tone: StatusTone;
  /** `sm` para dentro de linha de lista; `md` para cabeçalho de card. */
  size?: "sm" | "md";
  theme: Theme;
}

interface ParDeCores {
  fundo: string;
  texto: string;
}

function coresDoTom(tone: StatusTone, theme: Theme): ParDeCores {
  switch (tone) {
    case "success":
      return { fundo: theme.colors.successMuted, texto: theme.colors.success };
    case "warning":
      return { fundo: theme.colors.warningMuted, texto: theme.colors.warning };
    case "danger":
      return { fundo: theme.colors.dangerMuted, texto: theme.colors.danger };
    case "info":
      return { fundo: theme.colors.primaryMuted, texto: theme.colors.primary };
    case "neutral":
      return { fundo: theme.colors.surface, texto: theme.colors.textMuted };
  }
}

export function StatusPill({ label, tone, size = "sm", theme }: StatusPillProps): JSX.Element {
  const { fundo, texto } = coresDoTom(tone, theme);
  const denso = size === "sm";

  return (
    <View
      /*
        `accessibilityRole="text"` em vez de nada: o leitor de tela
        precisa anunciar o estado junto com a linha, e sem papel
        declarado ele às vezes pula a View.
      */
      accessibilityRole="text"
      accessibilityLabel={label}
      style={[
        styles.pill,
        {
          backgroundColor: fundo,
          borderRadius: theme.radius.full,
          paddingHorizontal: denso ? theme.spacing[2] : theme.spacing[3],
          paddingVertical: denso ? 2 : theme.spacing[1],
        },
      ]}
    >
      <Text numberOfLines={1} style={[styles.texto, { color: texto, fontSize: denso ? 11 : 13 }]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    alignSelf: "flex-start",
  },
  texto: {
    fontWeight: "600",
    /* Sem `letterSpacing` grande: etiqueta curta em português já é
       larga, e espaçar faz quebrar linha em celular de 360 pontos. */
    letterSpacing: 0.2,
  },
});
