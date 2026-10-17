import { LifeBuoy } from "@rotta/icons/native";
import { EmptyState } from "@rotta/ui/native";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";

import type { AdminSupportStackParamList } from "@/navigation/types";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { Texto } from "@/components/texto";
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
        <Texto style={{ color: theme.colors.danger }}>Não foi possível carregar os chamados.</Texto>
        <VehicleButton label="Tentar novamente" onPress={() => void refetch()} />
      </VehicleScreen>
    );
  }

  return (
    <VehicleScreen>
      {!data || data.items.length === 0 ? (
        <EmptyState
          title="Nenhum chamado aberto"
          description="Quando alguém pedir suporte pelo app, o chamado aparece aqui."
          icon={<LifeBuoy size={28} color={theme.colors.primary} />}
          theme={theme}
        />
      ) : (
        data.items.map((ticket) => (
          <Pressable
            accessibilityRole="button"
            key={ticket.id}
            onPress={() => navigation.navigate("Detalhes", { ticketId: ticket.id })}
          >
            <VehicleCard>
              <View style={styles.linha}>
                <Texto style={[styles.assunto, { color: theme.colors.text }]} numberOfLines={1}>
                  {ticket.assunto}
                </Texto>
                <StatusPill
                  label={SUPPORT_TICKET_STATUS_LABEL[ticket.status]}
                  tone={SUPPORT_TICKET_STATUS_TONE[ticket.status]}
                />
              </View>
              <Texto style={{ color: theme.colors.textMuted, fontSize: 12 }}>
                {ticket.companyNome} · {new Date(ticket.createdAt).toLocaleDateString("pt-BR")}
              </Texto>
            </VehicleCard>
          </Pressable>
        ))
      )}
    </VehicleScreen>
  );
}

const styles = StyleSheet.create({
  assunto: { flex: 1, fontSize: 16, fontWeight: "600" },
  center: { alignItems: "center", flex: 1, justifyContent: "center" },
  linha: { alignItems: "center", flexDirection: "row", gap: 8, justifyContent: "space-between" },
});
