import { Sparkles } from "@rotta/icons/native";
import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTheme } from "@/providers/theme-provider";

/**
 * Placeholder genérico "Em breve" — reaproveitado por toda feature
 * temporariamente desativada a pedido do usuário (01-02/09/2026:
 * Marketplace/Solicitar Transporte, Rotta Pay). Nenhuma tela original é
 * apagada nesses casos — só desconectada da navegação; reativar é
 * trocar de volta o `component` daquela rota.
 */
export function ComingSoonScreen({
  titulo = "Em breve",
  corpo = "Estamos preparando essa área. Volte em breve!",
}: {
  titulo?: string;
  corpo?: string;
}): JSX.Element {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.colors.background, paddingTop: insets.top + theme.spacing[8] },
      ]}
    >
      <View style={[styles.iconCircle, { backgroundColor: theme.colors.primaryMuted }]}>
        <Sparkles size={32} color={theme.colors.primary} />
      </View>
      <Text style={[styles.titulo, { color: theme.colors.text }]}>{titulo}</Text>
      <Text style={[styles.corpo, { color: theme.colors.textMuted }]}>{corpo}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    flex: 1,
    gap: 16,
    paddingHorizontal: 32,
  },
  corpo: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
  iconCircle: {
    alignItems: "center",
    borderRadius: 999,
    height: 64,
    justifyContent: "center",
    width: 64,
  },
  titulo: {
    fontSize: 20,
    fontWeight: "700",
  },
});
