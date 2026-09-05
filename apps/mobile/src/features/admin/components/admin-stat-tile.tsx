import { StyleSheet, Text, View } from "react-native";

import type { ReactNode } from "react";

import { VehicleCard } from "@/features/vehicles/components";
import { useTheme } from "@/providers/theme-provider";

/**
 * Cartão de indicador (ícone + valor + rótulo) da área Admin reduzida no
 * app — mesmo espírito do `StatTile` novo de `@rotta/ui/web` (Admin
 * Frente 1), mas local: `@rotta/ui/native` ainda não tem um componente
 * equivalente (só `Timeline`/`BottomSheet` hoje), e esta é a única tela
 * que precisa disso por enquanto — mesma decisão de escopo já registrada
 * em `vehicle-screen.tsx`.
 */
export function AdminStatTile({
  icon,
  value,
  label,
}: {
  icon: ReactNode;
  value: string | number;
  label: string;
}): JSX.Element {
  const { theme } = useTheme();

  return (
    <VehicleCard style={styles.card}>
      <View style={[styles.iconWrap, { backgroundColor: theme.colors.primaryMuted }]}>{icon}</View>
      <Text style={[styles.valor, { color: theme.colors.text }]}>{value}</Text>
      <Text style={{ color: theme.colors.textMuted, fontSize: 12 }} numberOfLines={2}>
        {label}
      </Text>
    </VehicleCard>
  );
}

const styles = StyleSheet.create({
  card: { flexBasis: "47%", flexGrow: 1 },
  iconWrap: {
    alignItems: "center",
    borderRadius: 999,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  valor: { fontSize: 22, fontWeight: "700" },
});
