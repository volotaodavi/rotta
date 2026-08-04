import { useEffect } from "react";
import { ActivityIndicator, Alert, StyleSheet, Text, View } from "react-native";


import {
  useDeleteNotification,
  useMarkNotificationRead,
  useNotification,
  useSetNotificationArquivada,
  useSetNotificationFavorita,
} from "../hooks/use-notifications";
import {
  COMMUNICATION_CHANNEL_LABEL,
  NOTIFICATION_PRIORITY_TONE,
  NOTIFICATION_TYPE_ICON,
} from "../labels";

import type { NotificationsStackParamList } from "@/navigation/types";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import {
  StatusPill,
  VehicleButton,
  VehicleCard,
  VehicleScreen,
} from "@/features/vehicles/components";
import { useTheme } from "@/providers/theme-provider";

type Props = NativeStackScreenProps<NotificationsStackParamList, "Detalhes">;

/**
 * Detalhes de uma notificação (Dossiê 11 §4.4) — marca como lida
 * automaticamente ao abrir (se ainda não estava), e reúne as ações do
 * inbox pessoal: favoritar, arquivar/desarquivar, excluir.
 */
export function DetalhesScreen({ route, navigation }: Props): JSX.Element {
  const { theme } = useTheme();
  const { notificationId } = route.params;
  const { data: notification, isLoading, isError } = useNotification(notificationId);
  const markRead = useMarkNotificationRead();
  const setFavorita = useSetNotificationFavorita();
  const setArquivada = useSetNotificationArquivada();
  const deleteNotification = useDeleteNotification();

  useEffect(() => {
    if (notification && !notification.lida) {
      markRead.mutate(notification.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notification?.id, notification?.lida]);

  function handleExcluir(): void {
    Alert.alert(
      "Excluir notificação",
      "Esta notificação será removida do seu histórico. Deseja continuar?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Excluir",
          style: "destructive",
          onPress: () => {
            deleteNotification.mutate(notificationId, {
              onSuccess: () => navigation.goBack(),
            });
          },
        },
      ],
    );
  }

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator color={theme.colors.primary} />
      </View>
    );
  }

  if (isError || !notification) {
    return (
      <VehicleScreen>
        <Text style={{ color: theme.colors.danger }}>
          Não foi possível carregar esta notificação.
        </Text>
      </VehicleScreen>
    );
  }

  return (
    <VehicleScreen>
      <VehicleCard>
        <View style={styles.linhaTitulo}>
          <Text style={styles.icone}>{NOTIFICATION_TYPE_ICON[notification.tipo]}</Text>
          <Text style={[styles.titulo, { color: theme.colors.text }]}>{notification.titulo}</Text>
        </View>
        <StatusPill
          label={notification.prioridade}
          tone={NOTIFICATION_PRIORITY_TONE[notification.prioridade]}
        />
        <Text style={{ color: theme.colors.text }}>{notification.corpo}</Text>
        <Text style={{ color: theme.colors.textMuted, fontSize: 12 }}>
          {new Date(notification.createdAt).toLocaleString("pt-BR")}
        </Text>
        {notification.canaisEscolhidos.length > 0 ? (
          <Text style={{ color: theme.colors.textMuted, fontSize: 12 }}>
            Enviada por:{" "}
            {notification.canaisEscolhidos
              .map((canal) => COMMUNICATION_CHANNEL_LABEL[canal])
              .join(", ")}
          </Text>
        ) : null}
      </VehicleCard>

      <VehicleButton
        label={notification.favoritada ? "★ Remover dos favoritos" : "☆ Favoritar"}
        variant="secondary"
        onPress={() =>
          setFavorita.mutate({ notificationId: notification.id, valor: !notification.favoritada })
        }
        isLoading={setFavorita.isPending}
      />
      <VehicleButton
        label={notification.arquivada ? "Desarquivar" : "Arquivar"}
        variant="secondary"
        onPress={() =>
          setArquivada.mutate({ notificationId: notification.id, valor: !notification.arquivada })
        }
        isLoading={setArquivada.isPending}
      />
      <VehicleButton
        label="Excluir"
        variant="ghost"
        onPress={handleExcluir}
        isLoading={deleteNotification.isPending}
      />
    </VehicleScreen>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: "center", flex: 1, justifyContent: "center" },
  icone: { fontSize: 22 },
  linhaTitulo: { alignItems: "center", flexDirection: "row", gap: 8 },
  titulo: { flex: 1, fontSize: 17, fontWeight: "700" },
});
