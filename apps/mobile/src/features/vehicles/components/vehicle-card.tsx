import { StyleSheet, View, type ViewProps } from "react-native";

import { useTheme } from "@/providers/theme-provider";

/**
 * Cartão base (borda + superfície elevada) — usado em todas as telas
 * "Vehicle*" (nome histórico; hoje é o kit visual compartilhado por
 * Responsável, Motorista e Empresa/Gestor fora do fluxo de Auth, ver
 * `vehicle-screen.tsx`). `radius.lg` (Dossiê 15 — redesign 15/09/2026,
 * print real da Rotta anexado pelo usuário: cartões mais arredondados
 * que o `radius.md` anterior, mesma troca já feita no fluxo de Auth).
 */
export function VehicleCard({ style, children, ...rest }: ViewProps): JSX.Element {
  const { theme } = useTheme();

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.colors.surfaceElevated,
          borderColor: theme.colors.border,
          borderRadius: theme.radius.lg,
          padding: theme.spacing[4],
          gap: theme.spacing[2],
        },
        style,
      ]}
      {...rest}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1 },
});
