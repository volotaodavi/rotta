import { useAuth } from "@rotta/auth/native";
import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import { PanelGreeting } from "../components";
import { useRouteTripHistory } from "../hooks/use-driver-history";
import { useMinhasRotas } from "../hooks/use-driver-routes";

import type { Route, Trip, TripStatus } from "@rotta/api-client";

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

type FiltroStatus = "todas" | "concluidas" | "canceladas";

const FILTRO_TABS: { id: FiltroStatus; label: string }[] = [
  { id: "todas", label: "Todas" },
  { id: "concluidas", label: "Concluídas" },
  { id: "canceladas", label: "Canceladas" },
];

function passaNoFiltro(status: TripStatus, filtro: FiltroStatus): boolean {
  if (filtro === "concluidas") return status === "FINALIZADA";
  if (filtro === "canceladas") return status === "CANCELADA";
  return true;
}

/**
 * Abas Todas/Concluídas/Canceladas (Frente M) — porta do padrão da
 * página "Atividades" do Painel Web (Frente K), pra harmonia entre as
 * duas plataformas. Sem "Tabs" nativo em `@rotta/ui/native` ainda
 * (mesma decisão de escopo de `vehicle-screen.tsx`) — controle simples
 * local, mesmo espírito visual (rótulo + sublinhado na aba ativa).
 */
function FiltroTabs({
  filtro,
  onChange,
}: {
  filtro: FiltroStatus;
  onChange: (filtro: FiltroStatus) => void;
}): JSX.Element {
  const { theme } = useTheme();

  return (
    <View style={styles.filtroRow}>
      {FILTRO_TABS.map((tab) => {
        const ativa = tab.id === filtro;
        return (
          <Pressable
            key={tab.id}
            accessibilityRole="button"
            onPress={() => onChange(tab.id)}
            style={[
              styles.filtroTab,
              { borderBottomColor: ativa ? theme.colors.primary : "transparent" },
            ]}
          >
            <Text
              style={{
                color: ativa ? theme.colors.primary : theme.colors.textMuted,
                fontWeight: ativa ? "700" : "500",
                fontSize: 13,
              }}
            >
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/**
 * Histórico de viagens do Motorista/Monitor (Prompt Mestre da Rotta,
 * Seção 7) — reaproveita `GET /trips/routes/:routeId/history`
 * (`TripsController`, já real e testado — usado antes só pelo painel
 * da transportadora). Nenhuma viagem inventada: quando a lista vem
 * vazia, mostra a mensagem honesta, nunca dado fictício.
 */
export function DriverHistoricoScreen(): JSX.Element {
  const { theme } = useTheme();
  const { user } = useAuth();
  const { data: rotasResult, isLoading } = useMinhasRotas();
  const rotas = rotasResult?.items ?? [];
  const [filtro, setFiltro] = useState<FiltroStatus>("todas");

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
        <PanelGreeting nome={user?.nome ?? ""} />
        <Text style={{ color: theme.colors.textMuted }}>
          Nenhuma rota atribuída a você ainda — sem histórico para mostrar.
        </Text>
      </VehicleScreen>
    );
  }

  return (
    <VehicleScreen>
      <PanelGreeting nome={user?.nome ?? ""} />
      <FiltroTabs filtro={filtro} onChange={setFiltro} />
      {rotas.map((rota) => (
        <RouteHistorySection key={rota.id} rota={rota} filtro={filtro} />
      ))}
    </VehicleScreen>
  );
}

function RouteHistorySection({ rota, filtro }: { rota: Route; filtro: FiltroStatus }): JSX.Element {
  const { theme } = useTheme();
  const { data, isLoading } = useRouteTripHistory(rota.id);
  const viagens = (data?.items ?? []).filter((trip) => passaNoFiltro(trip.status, filtro));

  return (
    <View style={styles.secao}>
      <Text style={[styles.tituloRota, { color: theme.colors.text }]}>{rota.nome}</Text>
      {isLoading ? (
        <ActivityIndicator color={theme.colors.primary} />
      ) : viagens.length === 0 ? (
        <Text style={{ color: theme.colors.textMuted }}>Nenhuma viagem nesta aba.</Text>
      ) : (
        viagens.map((trip) => <TripHistoryCard key={trip.id} trip={trip} />)
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
  filtroRow: { flexDirection: "row", gap: 16 },
  filtroTab: { borderBottomWidth: 2, paddingBottom: 6 },
  header: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  secao: { gap: 8 },
  tituloRota: { fontSize: 15, fontWeight: "700" },
});
