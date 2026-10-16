import { ChevronRight } from "@rotta/icons/native";
import { Pressable, StyleSheet, View } from "react-native";

import type { ComponentType } from "react";

import { Texto } from "@/components/texto";
import { useTheme } from "@/providers/theme-provider";

export interface MenuRowItem {
  icon: ComponentType<{ size?: number; color?: string }>;
  label: string;
  onPress: () => void;
  /** Ação destrutiva/de saída ("Sair") — vermelha e sem seta, como no conceito. */
  destrutivo?: boolean;
}

/**
 * Os atalhos do Perfil — ícone, rótulo e seta.
 *
 * Um componente só para os quatro Perfis de propósito: o padrão é
 * idêntico nas quatro telas do conceito (Responsável, Motorista,
 * Monitor e Gestor), então duplicar isso seria garantir que eles
 * divergissem na primeira alteração.
 *
 * ## O que mudou em 16/10/2026
 *
 * Era um cartão único com divisórias. No conceito que o fundador
 * aprovou, **cada atalho é um cartão próprio**, com respiro entre
 * eles. A diferença não é gosto: uma pilha de oito linhas dentro de uma
 * caixa só é uma tabela, e o dedo erra a linha; oito cartões separados
 * dão alvo próprio a cada um e é isso que o desenho mostra.
 *
 * "Sair" continua sendo a exceção, e agora pelo motivo certo: no
 * conceito ele é a única linha sem cartão e sem seta, em vermelho.
 * Sair não leva a outra tela, encerra — seta ali prometeria uma tela
 * que não existe.
 */
export function MenuRowList({ items }: { items: MenuRowItem[] }): JSX.Element {
  const { theme } = useTheme();

  return (
    <View style={styles.lista}>
      {items.map((item) => {
        const Icone = item.icon;

        if (item.destrutivo) {
          return (
            <Pressable
              key={item.label}
              accessibilityRole="button"
              accessibilityLabel={item.label}
              onPress={item.onPress}
              style={({ pressed }) => [styles.linhaSolta, pressed ? styles.pressionada : null]}
            >
              <Icone size={22} color={theme.colors.danger} />
              <Texto style={[styles.label, { color: theme.colors.danger }]}>{item.label}</Texto>
            </Pressable>
          );
        }

        return (
          <Pressable
            key={item.label}
            accessibilityRole="button"
            accessibilityLabel={item.label}
            onPress={item.onPress}
            style={({ pressed }) => [
              styles.cartao,
              theme.elevation.soft.native,
              {
                backgroundColor: theme.colors.card,
                borderColor: theme.colors.hairline,
                borderRadius: theme.radius.lg,
                paddingHorizontal: theme.spacing[4],
              },
              pressed ? styles.pressionada : null,
            ]}
          >
            <Icone size={22} color={theme.colors.text} />
            <Texto style={[styles.label, { color: theme.colors.text }]}>{item.label}</Texto>
            <ChevronRight size={18} color={theme.colors.textMuted} />
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  cartao: {
    alignItems: "center",
    borderWidth: 1,
    flexDirection: "row",
    gap: 14,
    /* 56 pontos: é a altura da linha no conceito, e dá alvo de toque
       confortável para oito atalhos seguidos. */
    minHeight: 56,
  },
  label: { flex: 1, fontSize: 15, fontWeight: "500" },
  linhaSolta: {
    alignItems: "center",
    flexDirection: "row",
    gap: 14,
    minHeight: 52,
    paddingHorizontal: 16,
  },
  lista: { gap: 8 },
  pressionada: { opacity: 0.65 },
});
