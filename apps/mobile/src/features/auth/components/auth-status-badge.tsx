import { StyleSheet, View } from "react-native";

import type { ComponentType } from "react";

import { useTheme } from "@/providers/theme-provider";

interface AuthStatusBadgeProps {
  /** Qualquer ícone de `@rotta/icons/native` (todos aceitam `size`/`color`/`strokeWidth`). */
  icon: ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
}

/**
 * Selo circular centralizado (ícone grande sobre fundo tingido) —
 * substitui, por ora, a ilustração customizada que o print de
 * referência usa nas telas de confirmação ("Verify Your Email",
 * "Password Changed"). Pedido do usuário 15/09/2026 era gerar essa
 * ilustração via Higgsfield, mas `higgsfield auth login` não está
 * configurado nesta sessão (`higgsfield workspace list` devolve "Not
 * authenticated") — sem forma de autenticar de dentro do container.
 * Este selo fica no lugar até a ilustração real poder ser gerada;
 * substituição é uma troca local de um `<Image>` neste componente,
 * sem mexer em quem o usa. Só cor `primary` por enquanto (Dossiê 24
 * §4.1: "nunca decoração, sempre significado" — sem token de
 * `successMuted` genérico na paleta, não inventa um hex novo aqui).
 */
export function AuthStatusBadge({ icon: Icon }: AuthStatusBadgeProps): JSX.Element {
  const { theme } = useTheme();

  return (
    <View style={styles.wrap}>
      <View style={[styles.ring, { backgroundColor: theme.colors.primaryMuted }]}>
        <View style={[styles.core, { backgroundColor: theme.colors.primary }]}>
          <Icon size={30} color={theme.colors.onPrimary} strokeWidth={2.25} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  core: {
    alignItems: "center",
    borderRadius: 9999,
    height: 64,
    justifyContent: "center",
    width: 64,
  },
  ring: {
    alignItems: "center",
    borderRadius: 9999,
    height: 96,
    justifyContent: "center",
    width: 96,
  },
  wrap: { alignItems: "center", paddingVertical: 8 },
});
