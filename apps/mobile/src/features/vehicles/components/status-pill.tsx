import { StyleSheet, Text, View } from "react-native";

import { useTheme } from "@/providers/theme-provider";

export type StatusPillTone = "success" | "warning" | "danger" | "info" | "neutral";

/** Selo colorido (status do veículo, severidade de ocorrência, análise Rotta AI). */
export function StatusPill({ label, tone }: { label: string; tone: StatusPillTone }): JSX.Element {
  const { theme } = useTheme();
  const color =
    tone === "success"
      ? theme.colors.success
      : tone === "warning"
        ? theme.colors.warning
        : tone === "danger"
          ? theme.colors.danger
          : tone === "info"
            ? theme.colors.info
            : theme.colors.textMuted;

  return (
    <View style={[styles.pill, { backgroundColor: `${color}26`, borderRadius: theme.radius.full }]}>
      <Text style={[styles.label, { color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 12, fontWeight: "600" },
  pill: { alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 4 },
});
