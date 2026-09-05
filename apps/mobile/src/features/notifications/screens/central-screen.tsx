import { Star } from "@rotta/icons/native";
import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotificationsList,
} from "../hooks/use-notifications";
import {
  NOTIFICATION_PRIORITY_TONE,
  NOTIFICATION_TYPE_ICON,
  NOTIFICATION_TYPE_TONE,
  type NotificationColorTone,
} from "../labels";

import type { NotificationsStackParamList } from "@/navigation/types";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { ListNotificationsParams } from "@rotta/api-client";
import type { Theme } from "@rotta/theme";

import {
  StatusPill,
  VehicleButton,
  VehicleCard,
  VehicleScreen,
} from "@/features/vehicles/components";
import { useTheme } from "@/providers/theme-provider";

/** Resolve o "tom" (`NotificationColorTone`) pra uma cor real de `theme.colors` — nunca uma cor solta. */
function resolveToneColor(theme: Theme, tone: NotificationColorTone): string {
  switch (tone) {
    case "success":
      return theme.colors.success;
    case "primary":
      return theme.colors.primary;
    case "warning":
      return theme.colors.warning;
    case "danger":
      return theme.colors.danger;
    case "info":
      return theme.colors.info;
    case "muted":
    default:
      return theme.colors.textMuted;
  }
}

type Props = NativeStackScreenProps<NotificationsStackParamList, "Central">;

type FiltroRapido = "todas" | "nao_lidas" | "favoritas";

const FILTROS: { value: FiltroRapido; label: string }[] = [
  { value: "todas", label: "Todas" },
  { value: "nao_lidas", label: "Não lidas" },
  { value: "favoritas", label: "Favoritas" },
];

function filtroParaParams(filtro: FiltroRapido): ListNotificationsParams {
  if (filtro === "nao_lidas") return { arquivada: false, lida: false };
  if (filtro === "favoritas") return { arquivada: false, favoritada: true };
  return { arquivada: false };
}

function tempoRelativo(createdAt: string): string {
  const diffMs = Date.now() - new Date(createdAt).getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "agora";
  if (diffMin < 60) return `há ${diffMin} min`;
  const diffHoras = Math.floor(diffMin / 60);
  if (diffHoras < 24) return `há ${diffHoras}h`;
  const diffDias = Math.floor(diffHoras / 24);
  return `há ${diffDias}d`;
}

/**
 * Central de Notificações Internas (Dossiê 11 §4.4) — lista todas as
 * notificações recebidas pelo usuário autenticado (independente do
 * canal efetivo de envio: push/WhatsApp/SMS/e-mail sempre deixam um
 * registro aqui). Arquivadas ficam fora desta lista (`Historico`).
 * Acesso às preferências de canal a partir do cabeçalho (mesmo local
 * descrito no Dossiê).
 */
export function CentralScreen({ navigation }: Props): JSX.Element {
  const { theme } = useTheme();
  const [filtro, setFiltro] = useState<FiltroRapido>("todas");
  const { data, isLoading, isError, refetch } = useNotificationsList(filtroParaParams(filtro));
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  const filtros = (
    <View style={[styles.filtrosRow, { gap: theme.spacing[2] }]}>
      {FILTROS.map((option) => (
        <VehicleButton
          key={option.value}
          label={option.label}
          variant={filtro === option.value ? "primary" : "secondary"}
          onPress={() => setFiltro(option.value)}
        />
      ))}
    </View>
  );

  function handleAbrir(notificationId: string, lida: boolean): void {
    if (!lida) markRead.mutate(notificationId);
    navigation.navigate("Detalhes", { notificationId });
  }

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
        {filtros}
        <Text style={{ color: theme.colors.danger }}>
          Não foi possível carregar suas notificações. Tente novamente mais tarde.
        </Text>
        <VehicleButton label="Tentar novamente" onPress={() => void refetch()} />
      </VehicleScreen>
    );
  }

  return (
    <VehicleScreen>
      {filtros}
      <VehicleButton
        label="Marcar todas como lidas"
        variant="ghost"
        onPress={() => markAllRead.mutate()}
        isLoading={markAllRead.isPending}
      />

      {!data || data.items.length === 0 ? (
        <Text style={{ color: theme.colors.textMuted }}>
          {filtro === "nao_lidas"
            ? "Nenhuma notificação não lida."
            : filtro === "favoritas"
              ? "Nenhuma notificação favoritada ainda."
              : "Nenhuma notificação recebida ainda."}
        </Text>
      ) : null}

      {data?.items.map((notification) => {
        const TipoIcone = NOTIFICATION_TYPE_ICON[notification.tipo];
        const corTipo = resolveToneColor(theme, NOTIFICATION_TYPE_TONE[notification.tipo]);
        return (
          <Pressable
            key={notification.id}
            onPress={() => handleAbrir(notification.id, notification.lida)}
          >
            <VehicleCard>
              <View style={styles.linhaTitulo}>
                <View style={[styles.iconeCirculo, { backgroundColor: `${corTipo}26` }]}>
                  <TipoIcone size={18} color={corTipo} />
                </View>
                <Text
                  style={[
                    styles.titulo,
                    { color: theme.colors.text, fontWeight: notification.lida ? "600" : "800" },
                  ]}
                  numberOfLines={1}
                >
                  {notification.titulo}
                </Text>
                {!notification.lida ? (
                  <View style={[styles.pontoNaoLida, { backgroundColor: theme.colors.primary }]} />
                ) : null}
              </View>
              <Text style={{ color: theme.colors.textMuted }} numberOfLines={2}>
                {notification.corpo}
              </Text>
              <View style={styles.linhaRodape}>
                <StatusPill
                  label={notification.prioridade}
                  tone={NOTIFICATION_PRIORITY_TONE[notification.prioridade]}
                />
                <View style={styles.linhaTempo}>
                  <Text style={{ color: theme.colors.textMuted, fontSize: 12 }}>
                    {tempoRelativo(notification.createdAt)}
                  </Text>
                  {notification.favoritada ? (
                    <Star size={12} color={theme.colors.textMuted} fill={theme.colors.textMuted} />
                  ) : null}
                </View>
              </View>
            </VehicleCard>
          </Pressable>
        );
      })}

      <VehicleButton
        label="Ver notificações arquivadas"
        variant="ghost"
        onPress={() => navigation.navigate("Historico")}
      />
    </VehicleScreen>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: "center", flex: 1, justifyContent: "center" },
  filtrosRow: { flexDirection: "row", flexWrap: "wrap" },
  iconeCirculo: {
    alignItems: "center",
    borderRadius: 999,
    height: 32,
    justifyContent: "center",
    width: 32,
  },
  linhaRodape: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  linhaTempo: { alignItems: "center", flexDirection: "row", gap: 4 },
  linhaTitulo: { alignItems: "center", flexDirection: "row", gap: 8 },
  pontoNaoLida: { borderRadius: 4, height: 8, width: 8 },
  titulo: { flex: 1, fontSize: 15 },
});
