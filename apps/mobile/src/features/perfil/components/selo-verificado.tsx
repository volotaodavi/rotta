import { Check } from "@rotta/icons/native";
import { StyleSheet, View } from "react-native";

import { useTheme } from "@/providers/theme-provider";

/**
 * Check azul redondo ao lado do nome (pedido do usuário 15/09/2026:
 * "aparecerá um check azul redondo, estilo verificado do Instagram,
 * informando que o perfil está 100% verificado para as funcionalidades
 * do app").
 *
 * Círculo cheio na cor de marca + check branco — desenhado assim, e não
 * com o `BadgeCheck` do lucide, porque o ícone pronto é um contorno
 * serrilhado que some em 18px ao lado de um nome; o círculo cheio lê
 * na hora, que é o ponto do selo.
 *
 * Quem renderiza isto SÓ deve renderizar quando `verificado` é true
 * (ver `use-perfil-verificacao.ts`) — um selo que aparece cinza/vazio
 * quando falta algo seria exatamente o "fingir verificado" que o
 * produto não faz.
 */
export function SeloVerificado({ size = 18 }: { size?: number }): JSX.Element {
  const { theme } = useTheme();

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel="Perfil verificado"
      style={[styles.circulo, { backgroundColor: theme.colors.primary, height: size, width: size }]}
    >
      <Check size={size * 0.62} color={theme.colors.onPrimary} strokeWidth={3.5} />
    </View>
  );
}

const styles = StyleSheet.create({
  circulo: {
    alignItems: "center",
    borderRadius: 999,
    justifyContent: "center",
  },
});
