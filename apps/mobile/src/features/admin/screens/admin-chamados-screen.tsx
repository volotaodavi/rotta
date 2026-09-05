import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import type { AdminSupportStackParamList } from "@/navigation/types";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { useSupportTickets } from "@/features/support/hooks/use-support";
import { SUPPORT_TICKET_STATUS_LABEL, SUPPORT_TICKET_STATUS_TONE } from "@/features/support/labels";
import {
  StatusPill,
  VehicleButton,
  VehicleCard,
  VehicleScreen,
} from "@/features/vehicles/components";
import { useTheme } from "@/providers/theme-provider";

type Props = NativeStackScreenProps<AdminSupportStackParamList, "Lista">;

/**
 * Fila de chamados vista pelo Admin Rotta (pedido do usuário
 * 05/09/2026) — mesmo `useSupportTickets` do app (já usado pelo
 * Responsável/Motorista/Monitor em `ChamadosScreen`), sem `companyId`:
 * o backend já retorna TODAS as empresas quando o ator autenticado é
 * `admin_rotta` (mesmo endpoint que `apps/admin` usa em `/suporte`, ver
 * `ListSupportTicketsParams`). Sem "Novo chamado" — o Admin responde,
 * não abre chamado próprio.
 */
export function AdminChamadosScreen({ navigation }: Props): JSX.Element {
  const { theme } = useTheme();
  const { data, isLoading, isError, refetch } = useSupportTickets({ pageSize: 50 });

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator color={theme.colors.primary} />
      </View>
    );
  }

  if (isError) {
    return (
      <VehicleScreen>
        <Text style={{ color: theme.colors.danger }}>Não foi possível carregar os chamados.</Text>
        <VehicleButton label="Tentar novamente" onPress={() => void refetch()} />
      </VehicleScreen>
    );
  }

  return (
    <VehicleScreen>
      {!data || data.items.length === 0 ? (
        <Text style={{ color: theme.colors.textMuted }}>Nenhum chamado no momento.</Text>
      ) : (
        data.items.map((ticket) => (
          <Pressable
            key={ticket.id}
            onPress={() => navigation.navigate("Detalhes", { ticketId: ticket.id })}
          >
            <VehicleCard>
              <View style={styles.linha}>
                <Text style={[styles.assunto, { color: theme.colors.text }]} numberOfLines={1}>
                  {ticket.assunto}
                </Text>
                <StatusPill
                  label={SUPPORT_TICKET_STATUS_LABEL[ticket.status]}
                  tone={SUPPORT_TICKET_STATUS_TONE[ticket.status]}
                />
              </View>
              <Text style={{ color: theme.colors.textMuted, fontSize: 12 }}>
                {ticket.companyNome} · {new Date(ticket.createdAt).toLocaleDateString("pt-BR")}
              </Text>
            </VehicleCard>
          </Pressable>
        ))
      )}
    </VehicleScreen>
  );
}

const styles = StyleSheet.create({
  assunto: { flex: 1, fontSize: 15, fontWeight: "600" },
  center: { alignItems: "center", flex: 1, justifyContent: "center" },
  linha: { alignItems: "center", flexDirection: "row", gap: 8, justifyContent: "space-between" },
});
