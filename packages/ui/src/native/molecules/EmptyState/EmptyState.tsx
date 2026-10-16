import { Pressable, StyleSheet, Text, View } from "react-native";

import type { Theme } from "@rotta/theme";

/**
 * EmptyState — a tela quando não há nada, que é o estado mais comum da
 * Rotta hoje.
 *
 * ## Por que este componente vem antes dos bonitos
 *
 * O conceito visual de 16/10/2026 tem 31 telas e **nenhuma mostra lista
 * vazia**. O app real, medido em 14/10/2026, tem 8 alunos, 10 viagens em
 * toda a história e a última em 28/08/2026. Ou seja: a tela que um
 * usuário da Rotta mais vê hoje é justamente a que ninguém desenhou.
 *
 * Vazio desenhado como vazio parece defeito. Vazio com uma frase que
 * diz o que houve e o que fazer parece produto.
 *
 * ## A regra da mensagem
 *
 * `title` diz o fato, sem desculpa e sem susto ("Nenhuma viagem hoje").
 * `description` diz por que ou o que fazer, em uma frase. A ação só
 * entra quando existe mesmo um próximo passo na mesma tela; botão que
 * leva a lugar nenhum é pior que ausência de botão.
 *
 * Erro NÃO usa este componente: erro tem causa e tentativa de novo, e
 * tratar falha de rede como "nada por aqui" esconde defeito, que foi
 * exatamente o que aconteceu com a renovação de sessão em 06/10/2026.
 */
export interface EmptyStateProps {
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  /** Ícone já renderizado pela tela, porque este pacote não escolhe ícone. */
  icon?: JSX.Element;
  theme: Theme;
}

export function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
  icon,
  theme,
}: EmptyStateProps): JSX.Element {
  const temAcao = Boolean(actionLabel && onAction);

  return (
    <View style={[styles.caixa, { paddingVertical: theme.spacing[8] }]}>
      {icon ? (
        <View
          style={[
            styles.icone,
            {
              backgroundColor: theme.colors.surface,
              borderRadius: theme.radius.full,
              marginBottom: theme.spacing[4],
            },
          ]}
        >
          {icon}
        </View>
      ) : null}

      <Text style={[styles.titulo, { color: theme.colors.text }]}>{title}</Text>

      {description ? (
        <Text
          style={[styles.descricao, { color: theme.colors.textMuted, marginTop: theme.spacing[2] }]}
        >
          {description}
        </Text>
      ) : null}

      {temAcao ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
          onPress={onAction}
          style={[
            styles.botao,
            {
              backgroundColor: theme.colors.primary,
              borderRadius: theme.radius.md,
              marginTop: theme.spacing[6],
              paddingHorizontal: theme.spacing[6],
              paddingVertical: theme.spacing[3],
            },
          ]}
        >
          <Text style={[styles.textoBotao, { color: theme.colors.onPrimary }]}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  caixa: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  icone: {
    alignItems: "center",
    justifyContent: "center",
    height: 64,
    width: 64,
  },
  titulo: {
    fontSize: 17,
    fontWeight: "700",
    textAlign: "center",
  },
  descricao: {
    fontSize: 14,
    lineHeight: 20,
    /* Centralizado e com largura contida: frase longa esticada de ponta
       a ponta numa tela de 360 pontos é difícil de ler. */
    maxWidth: 280,
    textAlign: "center",
  },
  botao: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
  },
  textoBotao: {
    fontSize: 15,
    fontWeight: "600",
  },
});
