import { StyleSheet, View } from "react-native";

import { useTheme } from "@/providers/theme-provider";

/**
 * Indicador de progresso discreto do onboarding (Seção 2: "● ○ ○").
 * O ponto ativo alonga em vez de só trocar de cor — mesma linguagem
 * "pill" já usada em outros indicadores de estado do Design System,
 * sem introduzir uma forma nova.
 */
export function ProgressDots({
  total,
  activeIndex,
}: {
  total: number;
  activeIndex: number;
}): JSX.Element {
  const { theme } = useTheme();

  return (
    <View style={styles.row} accessibilityRole="none">
      {Array.from({ length: total }).map((_, index) => {
        const isActive = index === activeIndex;
        return (
          <View
            key={index}
            style={[
              styles.dot,
              {
                width: isActive ? 22 : 7,
                backgroundColor: isActive ? theme.colors.primary : theme.colors.border,
              },
            ]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  dot: { borderRadius: 999, height: 7 },
  row: { alignItems: "center", flexDirection: "row", gap: 6, justifyContent: "center" },
});
