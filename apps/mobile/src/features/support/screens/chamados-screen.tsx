import { Plus } from "@rotta/icons/native";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";


import { useSupportTickets } from "../hooks/use-support";
import { SUPPORT_TICKET_STATUS_LABEL, SUPPORT_TICKET_STATUS_TONE } from "../labels";

import type { SupportStackParamList } from "@/navigation/types";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import {
  StatusPill,
  VehicleButton,
  VehicleCard,
  VehicleScreen,
} from "@/features/vehicles/components";
import { useTheme } from "@/providers/theme-provider";

type Props = NativeStackScreenProps<SupportStackParamList, "Lista">;

/**
 * Histórico de chamados (Epic B) — primeira tela de Suporte que existe
 * no app mobile, pra QUALQUER papel (antes só existia no Painel Web).
 * Espelha `apps/web/.../chamados/page.tsx`: mesma query
 * (`useSupportTickets`, escopo real resolvido no backend — Empresa/
 * Gestor veem o próprio tenant, Responsável vê só os próprios
 * chamados), mesmo estado vazio/erro.
 */
export function ChamadosScreen({ navigation }: Props): JSX.Element {
  const { theme } = useTheme();
  const { data, isLoading, isError, refetch } = useSupportTickets({ page: 1, pageSize: 50 });

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
        <Text style={{ color: theme.colors.danger }}>Não foi possível carregar seus chamados.</Text>
        <VehicleButton label="Tentar novamente" onPress={() => void refetch()} />
      </VehicleScreen>
    );
  }

  return (
    <VehicleScreen>
      <VehicleButton
        label="Novo chamado"
        icon={<Plus size={18} color="#FFFFFF" />}
        onPress={() => navigation.navigate("Novo")}
      />

      {!data || data.items.length === 0 ? (
        <Text style={{ color: theme.colors.textMuted }}>Nenhum chamado registrado ainda.</Text>
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
                {new Date(ticket.createdAt).toLocaleDateString("pt-BR")}
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
