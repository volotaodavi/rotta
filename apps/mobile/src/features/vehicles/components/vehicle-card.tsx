import { StyleSheet, View, type ViewProps } from "react-native";

import { useTheme } from "@/providers/theme-provider";

/** Cartão base (borda + superfície elevada) das telas de Veículos. */
export function VehicleCard({ style, children, ...rest }: ViewProps): JSX.Element {
  const { theme } = useTheme();

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.colors.surfaceElevated,
          borderColor: theme.colors.border,
          borderRadius: theme.radius.md,
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
