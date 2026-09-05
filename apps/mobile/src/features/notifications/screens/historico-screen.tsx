import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import { useNotificationsList, useSetNotificationArquivada } from "../hooks/use-notifications";
import { NOTIFICATION_PRIORITY_TONE, NOTIFICATION_TYPE_ICON } from "../labels";

import type { NotificationsStackParamList } from "@/navigation/types";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import {
  StatusPill,
  VehicleButton,
  VehicleCard,
  VehicleScreen,
} from "@/features/vehicles/components";
import { useTheme } from "@/providers/theme-provider";

type Props = NativeStackScreenProps<NotificationsStackParamList, "Historico">;

/**
 * Histórico de notificações arquivadas (Dossiê 11 §4.4) — mesmo padrão
 * de "Histórico nunca é apagado" de outros módulos (ex. manutenções de
 * veículo): arquivar aqui só tira a notificação da lista principal
 * (`Central`), nunca a exclui.
 */
export function HistoricoScreen({ navigation }: Props): JSX.Element {
  const { theme } = useTheme();
  const { data, isLoading, isError, refetch } = useNotificationsList({ arquivada: true });
  const setArquivada = useSetNotificationArquivada();

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
        <Text style={{ color: theme.colors.danger }}>
          Não foi possível carregar o histórico. Tente novamente mais tarde.
        </Text>
        <VehicleButton label="Tentar novamente" onPress={() => void refetch()} />
      </VehicleScreen>
    );
  }

  if (!data || data.items.length === 0) {
    return (
      <VehicleScreen>
        <Text style={{ color: theme.colors.textMuted }}>Nenhuma notificação arquivada ainda.</Text>
      </VehicleScreen>
    );
  }

  return (
    <VehicleScreen>
      {data.items.map((notification) => {
        const TipoIcone = NOTIFICATION_TYPE_ICON[notification.tipo];
        return (
          <VehicleCard key={notification.id}>
            <Pressable
              onPress={() => navigation.navigate("Detalhes", { notificationId: notification.id })}
            >
              <View style={styles.linhaTitulo}>
                <TipoIcone size={18} color={theme.colors.textMuted} />
                <Text style={[styles.titulo, { color: theme.colors.text }]} numberOfLines={1}>
                  {notification.titulo}
                </Text>
              </View>
              <Text style={{ color: theme.colors.textMuted }} numberOfLines={2}>
                {notification.corpo}
              </Text>
              <StatusPill
                label={notification.prioridade}
                tone={NOTIFICATION_PRIORITY_TONE[notification.prioridade]}
              />
            </Pressable>
            <VehicleButton
              label="Desarquivar"
              variant="secondary"
              onPress={() => setArquivada.mutate({ notificationId: notification.id, valor: false })}
              isLoading={setArquivada.isPending}
            />
          </VehicleCard>
        );
      })}
    </VehicleScreen>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: "center", flex: 1, justifyContent: "center" },
  linhaTitulo: { alignItems: "center", flexDirection: "row", gap: 8 },
  titulo: { flex: 1, fontSize: 15, fontWeight: "700" },
});
