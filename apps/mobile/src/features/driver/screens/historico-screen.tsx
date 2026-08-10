import { ActivityIndicator, StyleSheet, Text, View } from "react-native";


import { useRouteTripHistory } from "../hooks/use-driver-history";
import { useMinhasRotas } from "../hooks/use-driver-routes";

import type { Route, Trip } from "@rotta/api-client";

import { StatusPill, VehicleCard, VehicleScreen } from "@/features/vehicles/components";
import { useTheme } from "@/providers/theme-provider";

const TRIP_STATUS_LABEL: Record<
  string,
  { label: string; tone: "success" | "warning" | "neutral" }
> = {
  EM_ANDAMENTO: { label: "Em viagem", tone: "success" },
  PAUSADA: { label: "Pausada", tone: "warning" },
  FINALIZADA: { label: "Finalizada", tone: "neutral" },
  CANCELADA: { label: "Cancelada", tone: "neutral" },
};

/**
 * Histórico de viagens do Motorista/Monitor (Prompt Mestre da Rotta,
 * Seção 7) — reaproveita `GET /trips/routes/:routeId/history`
 * (`TripsController`, já real e testado — usado antes só pelo painel
 * da transportadora). Nenhuma viagem inventada: quando a lista vem
 * vazia, mostra a mensagem honesta, nunca dado fictício.
 */
export function DriverHistoricoScreen(): JSX.Element {
  const { theme } = useTheme();
  const { data: rotasResult, isLoading } = useMinhasRotas();
  const rotas = rotasResult?.items ?? [];

  if (isLoading) {
    return (
      <VehicleScreen>
        <ActivityIndicator color={theme.colors.primary} />
      </VehicleScreen>
    );
  }

  if (rotas.length === 0) {
    return (
      <VehicleScreen>
        <Text style={{ color: theme.colors.textMuted }}>
          Nenhuma rota atribuída a você ainda — sem histórico para mostrar.
        </Text>
      </VehicleScreen>
    );
  }

  return (
    <VehicleScreen>
      {rotas.map((rota) => (
        <RouteHistorySection key={rota.id} rota={rota} />
      ))}
    </VehicleScreen>
  );
}

function RouteHistorySection({ rota }: { rota: Route }): JSX.Element {
  const { theme } = useTheme();
  const { data, isLoading } = useRouteTripHistory(rota.id);

  return (
    <View style={styles.secao}>
      <Text style={[styles.tituloRota, { color: theme.colors.text }]}>{rota.nome}</Text>
      {isLoading ? (
        <ActivityIndicator color={theme.colors.primary} />
      ) : !data || data.items.length === 0 ? (
        <Text style={{ color: theme.colors.textMuted }}>Nenhuma viagem registrada ainda.</Text>
      ) : (
        data.items.map((trip) => <TripHistoryCard key={trip.id} trip={trip} />)
      )}
    </View>
  );
}

function TripHistoryCard({ trip }: { trip: Trip }): JSX.Element {
  const { theme } = useTheme();
  const duracaoMin =
    trip.finalizadaEm && trip.iniciadaEm
      ? Math.round(
          (new Date(trip.finalizadaEm).getTime() - new Date(trip.iniciadaEm).getTime()) / 60_000,
        )
      : null;

  return (
    <VehicleCard>
      <View style={styles.header}>
        <Text style={{ color: theme.colors.text }}>
          {new Date(trip.data).toLocaleDateString("pt-BR")}
        </Text>
        <StatusPill
          label={TRIP_STATUS_LABEL[trip.status]?.label ?? trip.status}
          tone={TRIP_STATUS_LABEL[trip.status]?.tone ?? "neutral"}
        />
      </View>
      <Text style={{ color: theme.colors.textMuted, fontSize: 12 }}>
        Início: {new Date(trip.iniciadaEm).toLocaleTimeString("pt-BR")}
        {duracaoMin !== null ? ` — duração: ${duracaoMin} min` : ""}
      </Text>
    </VehicleCard>
  );
}

const styles = StyleSheet.create({
  header: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  secao: { gap: 8 },
  tituloRota: { fontSize: 15, fontWeight: "700" },
});
