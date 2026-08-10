import { useAuth } from "@rotta/auth/native";
import { Check, MapPin, Pause, Play, Square, UserX } from "@rotta/icons/native";
import { RottaMap, type RottaMapMarker } from "@rotta/maps/native";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";


import {
  useMinhasRotas,
  useRouteStops,
  useRouteStudents,
  useStudent,
} from "../hooks/use-driver-routes";
import {
  useAddStudentEvent,
  useFinishTrip,
  usePauseTrip,
  useResumeTrip,
  useStartTrip,
  useTodayTrip,
  useTripStudentEvents,
} from "../hooks/use-driver-trip";
import { useTripGpsReporting } from "../hooks/use-trip-gps-reporting";

import type { Route, RouteStop, RouteStudent, TripStudentEvent } from "@rotta/api-client";

import {
  StatusPill,
  VehicleButton,
  VehicleCard,
  VehicleScreen,
} from "@/features/vehicles/components";
import { useTheme } from "@/providers/theme-provider";

/**
 * "Início" real do Motorista/Monitor (Prompt Mestre da Rotta, Seções 7
 * ("visualizar escala/rota/paradas, iniciar/pausar/finalizar viagem")
 * e 9 ("Monitor visualiza apenas o necessário, sem os privilégios do
 * Motorista")). Substitui o placeholder "em construção" que existia
 * desde a fundação do app (`DriverNavigator.tsx`) — todo o backend
 * (`TripsModule`/`RoutesModule`) já existia e já era testado; faltava
 * só esta tela.
 *
 * `useMinhasRotas` já devolve só as rotas atribuídas a este usuário
 * (`RoutesService.list` escopa por `motoristaPadraoId`/`monitorPadraoId`
 * quando o ator é Motorista/Monitor — nunca a operação inteira da
 * empresa, Seção 5/9 do Prompt).
 */
export function DriverInicioScreen(): JSX.Element {
  const { theme } = useTheme();
  const { data: rotasResult, isLoading } = useMinhasRotas();
  const rotas = rotasResult?.items ?? [];
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedRouteId && rotas.length === 1 && rotas[0]) setSelectedRouteId(rotas[0].id);
  }, [rotas, selectedRouteId]);

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
        <Text style={[styles.titulo, { color: theme.colors.text }]}>Nenhuma rota atribuída</Text>
        <Text style={{ color: theme.colors.textMuted }}>
          Você ainda não está vinculado a nenhuma rota. Fale com sua transportadora.
        </Text>
      </VehicleScreen>
    );
  }

  const rotaAtiva = selectedRouteId ? rotas.find((r) => r.id === selectedRouteId) : null;

  if (!rotaAtiva) {
    return (
      <VehicleScreen>
        <Text style={[styles.titulo, { color: theme.colors.text }]}>Suas rotas</Text>
        {rotas.map((rota) => (
          <Pressable key={rota.id} onPress={() => setSelectedRouteId(rota.id)}>
            <VehicleCard>
              <Text style={{ color: theme.colors.text }}>{rota.nome}</Text>
              <Text style={{ color: theme.colors.textMuted }}>{TURNO_LABEL[rota.turno]}</Text>
            </VehicleCard>
          </Pressable>
        ))}
      </VehicleScreen>
    );
  }

  return (
    <RotaOperacional
      rota={rotaAtiva}
      showTrocarRota={rotas.length > 1}
      onTrocarRota={() => setSelectedRouteId(null)}
    />
  );
}

const TURNO_LABEL: Record<string, string> = {
  MANHA: "Manhã",
  TARDE: "Tarde",
  NOITE: "Noite",
  INTEGRAL: "Integral",
};

const TRIP_STATUS_LABEL: Record<
  string,
  { label: string; tone: "success" | "warning" | "neutral" }
> = {
  EM_ANDAMENTO: { label: "Em viagem", tone: "success" },
  PAUSADA: { label: "Pausada", tone: "warning" },
  FINALIZADA: { label: "Finalizada", tone: "neutral" },
  CANCELADA: { label: "Cancelada", tone: "neutral" },
};

function RotaOperacional({
  rota,
  showTrocarRota,
  onTrocarRota,
}: {
  rota: Route;
  showTrocarRota: boolean;
  onTrocarRota: () => void;
}): JSX.Element {
  const { theme } = useTheme();
  const { user } = useAuth();
  const isMotorista = user?.role === "motorista";

  const { data: trip, isLoading: isLoadingTrip } = useTodayTrip(rota.id);
  const { data: stops } = useRouteStops(rota.id);
  const { data: routeStudents } = useRouteStudents(rota.id);
  const { data: studentEvents } = useTripStudentEvents(trip?.id);

  const startTrip = useStartTrip(rota.id);
  const pauseTrip = usePauseTrip(rota.id);
  const resumeTrip = useResumeTrip(rota.id);
  const finishTrip = useFinishTrip(rota.id);

  const isActive = trip?.status === "EM_ANDAMENTO";
  const isPaused = trip?.status === "PAUSADA";
  const { status: gpsStatus } = useTripGpsReporting(
    isMotorista && isActive && trip ? trip.id : null,
  );

  const paradasOrdenadas = [...(stops ?? [])].sort((a, b) => a.ordem - b.ordem);
  const markers: RottaMapMarker[] = paradasOrdenadas.map((parada) => ({
    id: parada.id,
    titulo: `${parada.ordem}. ${parada.endereco}`,
    latitude: parada.latitude,
    longitude: parada.longitude,
  }));

  return (
    <VehicleScreen>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.titulo, { color: theme.colors.text }]}>{rota.nome}</Text>
          <Text style={{ color: theme.colors.textMuted }}>{TURNO_LABEL[rota.turno]}</Text>
        </View>
        {trip ? (
          <StatusPill
            label={TRIP_STATUS_LABEL[trip.status]?.label ?? trip.status}
            tone={TRIP_STATUS_LABEL[trip.status]?.tone ?? "neutral"}
          />
        ) : null}
      </View>

      {showTrocarRota ? (
        <VehicleButton label="Trocar de rota" variant="secondary" onPress={onTrocarRota} />
      ) : null}

      {markers.length > 0 ? (
        <View style={styles.mapa}>
          <RottaMap
            markers={markers}
            route={paradasOrdenadas.map((p) => ({ latitude: p.latitude, longitude: p.longitude }))}
            initialZoom={12}
          />
        </View>
      ) : null}

      {isLoadingTrip ? (
        <ActivityIndicator color={theme.colors.primary} />
      ) : !trip ? (
        <VehicleCard>
          <Text style={{ color: theme.colors.text }}>Nenhuma viagem registrada hoje ainda.</Text>
          {isMotorista ? (
            <VehicleButton
              label="Iniciar viagem"
              icon={<Play size={16} color="#FFFFFF" />}
              onPress={() => startTrip.mutate({ routeId: rota.id })}
              isLoading={startTrip.isPending}
            />
          ) : (
            <Text style={{ color: theme.colors.textMuted }}>
              Aguardando o motorista iniciar a viagem.
            </Text>
          )}
        </VehicleCard>
      ) : trip.status === "FINALIZADA" || trip.status === "CANCELADA" ? (
        <VehicleCard>
          <Text style={{ color: theme.colors.text }}>
            A viagem de hoje já foi {trip.status === "FINALIZADA" ? "finalizada" : "cancelada"}.
          </Text>
        </VehicleCard>
      ) : (
        <>
          {isMotorista ? (
            <VehicleCard>
              <View style={styles.controlesRow}>
                {isActive ? (
                  <VehicleButton
                    label="Pausar"
                    variant="secondary"
                    icon={<Pause size={16} color={theme.colors.text} />}
                    onPress={() => pauseTrip.mutate(trip.id)}
                    isLoading={pauseTrip.isPending}
                  />
                ) : isPaused ? (
                  <VehicleButton
                    label="Retomar"
                    icon={<Play size={16} color="#FFFFFF" />}
                    onPress={() => resumeTrip.mutate(trip.id)}
                    isLoading={resumeTrip.isPending}
                  />
                ) : null}
                <VehicleButton
                  label="Finalizar viagem"
                  variant="secondary"
                  icon={<Square size={16} color={theme.colors.text} />}
                  onPress={() => finishTrip.mutate(trip.id)}
                  isLoading={finishTrip.isPending}
                />
              </View>
              {isActive ? (
                <Text style={{ color: theme.colors.textMuted, fontSize: 12 }}>
                  {gpsStatus === "reporting"
                    ? "Compartilhando sua localização com os responsáveis."
                    : gpsStatus === "requesting"
                      ? "Solicitando permissão de localização…"
                      : gpsStatus === "denied"
                        ? "Localização negada — os responsáveis não verão o veículo no mapa até você permitir."
                        : null}
                </Text>
              ) : null}
            </VehicleCard>
          ) : null}

          <Text style={[styles.secao, { color: theme.colors.text }]}>Paradas</Text>
          {paradasOrdenadas.map((parada) => (
            <ParadaCard
              key={parada.id}
              parada={parada}
              alunos={(routeStudents ?? []).filter(
                (aluno) =>
                  aluno.paradaEmbarqueId === parada.id || aluno.paradaDesembarqueId === parada.id,
              )}
              eventos={studentEvents ?? []}
              tripId={trip.id}
              podeOperar={isActive}
            />
          ))}
        </>
      )}
    </VehicleScreen>
  );
}

function ParadaCard({
  parada,
  alunos,
  eventos,
  tripId,
  podeOperar,
}: {
  parada: RouteStop;
  alunos: RouteStudent[];
  eventos: TripStudentEvent[];
  tripId: string;
  podeOperar: boolean;
}): JSX.Element {
  const { theme } = useTheme();

  return (
    <VehicleCard>
      <View style={styles.paradaHeader}>
        <MapPin size={16} color={theme.colors.textMuted} />
        <View style={{ flex: 1 }}>
          <Text style={{ color: theme.colors.text }}>
            {parada.ordem}. {parada.endereco}
          </Text>
          <Text style={{ color: theme.colors.textMuted, fontSize: 12 }}>
            Previsto: {parada.horarioPrevisto}
          </Text>
        </View>
      </View>

      {alunos.length === 0 ? (
        <Text style={{ color: theme.colors.textMuted, fontSize: 12 }}>
          Nenhum aluno embarca/desembarca aqui.
        </Text>
      ) : (
        alunos.map((aluno) => (
          <AlunoParadaRow
            key={aluno.id}
            aluno={aluno}
            parada={parada}
            eventos={eventos}
            tripId={tripId}
            podeOperar={podeOperar}
          />
        ))
      )}
    </VehicleCard>
  );
}

function AlunoParadaRow({
  aluno,
  parada,
  eventos,
  tripId,
  podeOperar,
}: {
  aluno: RouteStudent;
  parada: RouteStop;
  eventos: TripStudentEvent[];
  tripId: string;
  podeOperar: boolean;
}): JSX.Element {
  const { theme } = useTheme();
  const { data: student } = useStudent(aluno.studentId);
  const addEvent = useAddStudentEvent(tripId);
  const [motivoAusencia, setMotivoAusencia] = useState<string | null>(null);

  const isEmbarque = aluno.paradaEmbarqueId === parada.id;
  const tipo = isEmbarque ? "EMBARCOU" : "DESEMBARCOU";
  const jaEmbarcou = eventos.some((e) => e.studentId === aluno.studentId && e.tipo === "EMBARCOU");
  const jaOcorreu = eventos.some((e) => e.studentId === aluno.studentId && e.tipo === tipo);
  const jaAusente = eventos.some((e) => e.studentId === aluno.studentId && e.tipo === "AUSENTE");
  // Desembarque só é possível depois de um embarque registrado nesta viagem (mesma regra do backend).
  const podeRegistrar = podeOperar && !jaOcorreu && !jaAusente && (isEmbarque || jaEmbarcou);

  return (
    <View style={styles.alunoRow}>
      <Text style={{ color: theme.colors.text, flex: 1 }}>
        {isEmbarque ? "Embarque" : "Desembarque"}: {student?.nome ?? "Carregando…"}
      </Text>
      {jaOcorreu ? (
        <Check size={18} color={theme.colors.success} />
      ) : jaAusente ? (
        <Text style={{ color: theme.colors.danger, fontSize: 12 }}>Ausente</Text>
      ) : motivoAusencia !== null && isEmbarque ? (
        <View style={styles.ausenciaForm}>
          <Pressable
            onPress={() =>
              addEvent.mutate(
                { studentId: aluno.studentId, tipo: "AUSENTE" },
                { onSuccess: () => setMotivoAusencia(null) },
              )
            }
          >
            <Text style={{ color: theme.colors.danger, fontSize: 12 }}>Confirmar ausência</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.alunoActions}>
          <Pressable
            accessibilityRole="button"
            disabled={!podeRegistrar || addEvent.isPending}
            onPress={() => addEvent.mutate({ studentId: aluno.studentId, tipo })}
            style={{ opacity: podeRegistrar ? 1 : 0.4 }}
          >
            <Check size={20} color={theme.colors.success} />
          </Pressable>
          {isEmbarque ? (
            <Pressable
              accessibilityRole="button"
              disabled={!podeOperar}
              onPress={() => setMotivoAusencia("")}
              style={{ opacity: podeOperar ? 1 : 0.4 }}
            >
              <UserX size={20} color={theme.colors.danger} />
            </Pressable>
          ) : null}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  alunoActions: { flexDirection: "row", gap: 16 },
  alunoRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    paddingVertical: 6,
  },
  ausenciaForm: { alignItems: "center" },
  controlesRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  header: { alignItems: "flex-start", flexDirection: "row", gap: 8 },
  mapa: { borderRadius: 12, height: 180, overflow: "hidden" },
  paradaHeader: { alignItems: "flex-start", flexDirection: "row", gap: 8 },
  secao: { fontSize: 16, fontWeight: "700" },
  titulo: { fontSize: 18, fontWeight: "700" },
});
