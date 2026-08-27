import { BottomSheet } from "@rotta/ui/native";
import { StyleSheet, Text, View } from "react-native";

import { AuthButton } from "@/features/auth/components";
import {
  useAcknowledgeVehicleAdminReview,
  usePendingVehicleAdminReviewAcknowledgements,
} from "@/features/vehicles/hooks/use-vehicles";
import { useTheme } from "@/providers/theme-provider";

/**
 * "Li e concordo" (Epic A, Responsável) — paridade nativa de
 * `apps/web/src/features/vehicles/components/vehicle-admin-review-acknowledge-modal.tsx`.
 * Mostra, um de cada vez, o veículo aprovado com observação ainda não
 * reconhecido. Nunca bloqueia o uso do app: some quando não há
 * pendência e reaparece (o `BottomSheet` pode ser arrastado pra
 * fechar) na próxima vez que a tela remontar, enquanto a pendência
 * continuar existindo no backend. De propósito só existe UM botão —
 * nunca "recusar" (pedido explícito do usuário).
 */
export function VehicleAdminReviewAcknowledgeSheet(): JSX.Element | null {
  const { theme } = useTheme();
  const { data } = usePendingVehicleAdminReviewAcknowledgements();
  const pending = data?.[0];
  const acknowledge = useAcknowledgeVehicleAdminReview(pending?.vehicleId ?? "");

  if (!pending) return null;

  return (
    <BottomSheet
      isOpen
      onClose={() => undefined}
      theme={theme}
      title={`Aviso sobre o veículo ${pending.placa}`}
    >
      <View style={[styles.content, { padding: theme.spacing[6] }]}>
        <Text style={[styles.subtitle, { color: theme.colors.textMuted }]}>
          A Rotta do Brasil analisou este veículo e tem uma observação para você.
        </Text>
        <Text style={[styles.body, { color: theme.colors.text }]}>{pending.observacao}</Text>
        <AuthButton
          label="Li e concordo"
          isLoading={acknowledge.isPending}
          onPress={() => acknowledge.mutate()}
        />
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  body: { fontSize: 15, lineHeight: 22 },
  content: { flex: 1, gap: 16 },
  subtitle: { fontSize: 13 },
});
