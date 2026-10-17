import { fonteNativa } from "@rotta/theme";
import { Pressable, StyleSheet, View } from "react-native";

import { Texto } from "../../atoms/Texto";

import type { Theme } from "@rotta/theme";

/**
 * SectionHeader — o título de seção com a ação à direita.
 *
 * "Movimentações / Ver todas", "Faturas da criança / Ver todas",
 * "Próxima viagem", "Alunos". Aparece em praticamente toda tela de
 * conteúdo do conceito visual de 16/10/2026 e, hoje, cada tela desenha o
 * seu, com tamanho e peso diferentes.
 *
 * A ação é opcional de propósito: seção sem destino continua sendo
 * seção, e inventar um "Ver todas" que não leva a lugar nenhum é pior
 * que não ter.
 */
export interface SectionHeaderProps {
  title: string;
  /** Texto da ação à direita. Sem `onAction`, nada é desenhado. */
  actionLabel?: string;
  onAction?: () => void;
  theme: Theme;
}

export function SectionHeader({
  title,
  actionLabel,
  onAction,
  theme,
}: SectionHeaderProps): JSX.Element {
  const temAcao = Boolean(actionLabel && onAction);

  return (
    <View style={[styles.linha, { marginBottom: theme.spacing[3] }]}>
      <Texto
        accessibilityRole="header"
        numberOfLines={1}
        style={[styles.titulo, { color: theme.colors.text }]}
      >
        {title}
      </Texto>
      {temAcao ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
          onPress={onAction}
          /*
            Área de toque mínima de 44 pontos, medida pelo hitSlop em vez
            de padding: padding aqui empurraria o texto e desalinharia o
            título da linha de baixo.
          */
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Texto style={[styles.acao, { color: theme.colors.primary }]}>{actionLabel}</Texto>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  linha: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  titulo: {
    flexShrink: 1,
    fontFamily: fonteNativa(700),
    fontSize: 16,
    letterSpacing: -0.2,
  },
  acao: {
    fontFamily: fonteNativa(600),
    fontSize: 13,
  },
});
