import { useAuth } from "@rotta/auth/native";
import { Check, Clock, MapPin, Navigation, Pause, Square, UserX } from "@rotta/icons/native";
import { RottaMap, type RottaMapMarker } from "@rotta/maps/native";
import { buildNavigationUrl } from "@rotta/maps/navigation";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PanelGreeting } from "../components";
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
  useTripProximasEtas,
  useTripStudentEvents,
} from "../hooks/use-driver-trip";
import { useMyLocation, type MyLocation, type MyLocationStatus } from "../hooks/use-my-location";
import { useTripGpsReporting } from "../hooks/use-trip-gps-reporting";

import type { NextEta, Route, RouteStop, RouteStudent, TripStudentEvent } from "@rotta/api-client";

import { RecenterButton, RouteFromToCard } from "@/components/route-screen-chrome";
import { SlideToAction } from "@/components/slide-to-action";
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
  const { user } = useAuth();
  const { data: rotasResult, isLoading } = useMinhasRotas();
  const rotas = rotasResult?.items ?? [];
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedRouteId && rotas.length === 1 && rotas[0]) setSelectedRouteId(rotas[0].id);
  }, [rotas, selectedRouteId]);

  // Só liga fora da operação (nenhuma rota escolhida ainda) — dentro
  // de `RotaOperacional` existe uma segunda chamada própria, ligada só
  // quando faltam paradas pra mostrar (Frente M, mesma regra da
  // Frente I no Painel Web).
  const rotaAtiva = selectedRouteId ? rotas.find((r) => r.id === selectedRouteId) : null;
  const minhaLocalizacao = useMyLocation(!isLoading && !rotaAtiva);

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
        <Text style={[styles.titulo, { color: theme.colors.text }]}>Nenhuma rota atribuída</Text>
        <Text style={{ color: theme.colors.textMuted }}>
          Você ainda não está vinculado a nenhuma rota. Fale com sua transportadora.
        </Text>
        <MeuMapa location={minhaLocalizacao.location} status={minhaLocalizacao.status} />
      </VehicleScreen>
    );
  }

  if (!rotaAtiva) {
    return (
      <VehicleScreen>
        <PanelGreeting nome={user?.nome ?? ""} />
        <Text style={[styles.titulo, { color: theme.colors.text }]}>Suas rotas</Text>
        {rotas.map((rota) => (
          <Pressable key={rota.id} onPress={() => setSelectedRouteId(rota.id)}>
            <VehicleCard>
              <Text style={{ color: theme.colors.text }}>{rota.nome}</Text>
              <Text style={{ color: theme.colors.textMuted }}>{TURNO_LABEL[rota.turno]}</Text>
            </VehicleCard>
          </Pressable>
        ))}
        <MeuMapa location={minhaLocalizacao.location} status={minhaLocalizacao.status} />
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

/**
 * Mapa "onde eu estou" — respaldo baseado só na posição do telefone
 * (`useMyLocation`), usado sempre que não há paradas de rota pra
 * mostrar em vez disso. Porta exata de `MeuMapa` do Painel Web
 * (Frente I/P4) — nunca esconde a tela atrás de um carregamento
 * indefinido: pedir/negar permissão e "sem suporte" têm cada um sua
 * própria mensagem.
 */
function MeuMapa({
  location,
  status,
  fill = false,
  mapKey = 0,
}: {
  location: MyLocation | null;
  status: MyLocationStatus;
  /** `true` dentro do mapa em tela cheia de `RotaOperacional` — ocupa 100% do pai (`StyleSheet.absoluteFillObject`), sem cantos arredondados/altura fixa. */
  fill?: boolean;
  /** Troca pra remontar o mapa (Frente Q — botão "centralizar no meu GPS"). */
  mapKey?: number;
}): JSX.Element {
  const { theme } = useTheme();

  if (!location) {
    return (
      <View
        style={[
          fill ? styles.mapaVazioFill : styles.mapaVazio,
          { backgroundColor: theme.colors.card },
        ]}
      >
        {status === "requesting" || status === "idle" ? (
          <>
            <ActivityIndicator color={theme.colors.primary} />
            <Text style={{ color: theme.colors.textMuted, fontSize: 12 }}>
              Buscando sua localização…
            </Text>
          </>
        ) : status === "denied" ? (
          <Text style={{ color: theme.colors.textMuted, fontSize: 12, textAlign: "center" }}>
            Localização negada. Permita o acesso nas configurações do app para ver o mapa.
          </Text>
        ) : (
          <Text style={{ color: theme.colors.textMuted, fontSize: 12 }}>Mapa indisponível.</Text>
        )}
      </View>
    );
  }

  return (
    <View style={fill ? styles.absoluteFill : styles.mapa}>
      <RottaMap
        key={mapKey}
        markers={[
          {
            id: "minha-localizacao",
            titulo: "Você está aqui",
            latitude: location.latitude,
            longitude: location.longitude,
          },
        ]}
        initialCenter={location}
        initialZoom={14}
      />
    </View>
  );
}

/**
 * Cartão "próxima parada" (Frente M) — porta de `ProximaParadaEtaCard`
 * do Painel Web (Frente L): mesma ideia do cartão de ETA de uma imagem
 * de referência de app de mobilidade ("Track Rider"), com o motorista/
 * monitor vendo o PRÓPRIO progresso. Dado real (`NextEta`, tarefa #99)
 * — nunca uma estimativa inventada no app.
 *
 * "Navegar" (Frente S2, mesma decisão do Painel Web — pedido do
 * usuário: "acha melhor integrar o Google Maps para navegação e GPS,
 * enquanto o openstreet fica para os responsáveis") — `Linking.openURL`
 * pro deep-link universal do Apple Maps (iOS) ou Google Maps (Android),
 * com a coordenada real da próxima parada (`parada`, a mesma que já
 * vira marcador no `RottaMap`). Sem custo, sem SDK de navegação
 * embutido. Só aparece quando `parada` existe.
 */
function ProximaParadaEtaCard({ eta, parada }: { eta: NextEta; parada?: RouteStop }): JSX.Element {
  const { theme } = useTheme();
  const horarioPrevisto = new Date(eta.etaPrevista).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const distancia =
    eta.distanciaMetros >= 1000
      ? `${(eta.distanciaMetros / 1000).toFixed(1)} km`
      : `${Math.round(eta.distanciaMetros)} m`;

  function handleNavegar(): void {
    if (!parada) return;
    const app = Platform.OS === "ios" ? "apple" : "google";
    const url = buildNavigationUrl({ latitude: parada.latitude, longitude: parada.longitude }, app);
    Linking.openURL(url).catch(() => {
      // Nenhum app de mapas instalado/URL recusada pelo SO — sem
      // fallback silencioso: o toque simplesmente não faz nada visível,
      // mesmo padrão "stub honesto" do resto da base (nunca finge êxito).
    });
  }

  return (
    <VehicleCard style={styles.etaCard}>
      <Navigation size={20} color={theme.colors.primary} />
      <View style={{ flex: 1 }}>
        <Text style={{ color: theme.colors.textMuted, fontSize: 11 }}>Próxima parada</Text>
        <Text style={{ color: theme.colors.text, fontWeight: "600" }}>{eta.endereco}</Text>
      </View>
      <View style={{ alignItems: "flex-end", gap: 2 }}>
        <View style={styles.etaHorario}>
          <Clock size={12} color={theme.colors.primary} />
          <Text style={{ color: theme.colors.primary, fontWeight: "600", fontSize: 13 }}>
            {horarioPrevisto}
          </Text>
        </View>
        <Text style={{ color: theme.colors.textMuted, fontSize: 11 }}>{distancia}</Text>
      </View>
      {parada ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Navegar até a próxima parada"
          onPress={handleNavegar}
          style={[styles.navegarButton, { backgroundColor: theme.colors.primaryMuted }]}
        >
          <Navigation size={16} color={theme.colors.primary} />
        </Pressable>
      ) : null}
    </VehicleCard>
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
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
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

  // Respaldo (Frente M, mesma regra da Frente I no Painel Web): sem
  // paradas cadastradas ainda pra essa rota, mostra pelo menos onde o
  // telefone está — nunca deixa a tela sem mapa nenhum.
  const minhaLocalizacao = useMyLocation(markers.length === 0);
  const { data: proximasEtas } = useTripProximasEtas(isActive && trip ? trip.id : undefined);
  const proximaParada = proximasEtas?.[0];
  // Coordenada real da próxima parada (mesma lista que já vira marcador
  // no mapa acima) — alimenta o botão "Navegar" do cartão de ETA.
  const proximaParadaStop = proximaParada
    ? paradasOrdenadas.find((parada) => parada.id === proximaParada.routeStopId)
    : undefined;

  // Botão "centralizar no meu GPS" (Frente Q, imagem de referência) —
  // `RottaMap` só lê `initialCenter`/faz fit de bounds na montagem,
  // então recentralizar de verdade remonta o mapa com uma nova `key`.
  const [mapKey, setMapKey] = useState(0);
  const distanciaProximaParada = proximaParada
    ? proximaParada.distanciaMetros >= 1000
      ? `${(proximaParada.distanciaMetros / 1000).toFixed(1)} km`
      : `${Math.round(proximaParada.distanciaMetros)} m`
    : null;

  const gpsAvisoTexto =
    gpsStatus === "reporting"
      ? "Compartilhando sua localização com os responsáveis."
      : gpsStatus === "requesting"
        ? "Solicitando permissão de localização…"
        : gpsStatus === "denied"
          ? "Localização negada. Os responsáveis não verão o veículo no mapa até você permitir."
          : null;

  // Mesma altura mínima do Painel Web (Frente P4/P5, pedido do usuário
  // em produção: "o mapa não deve ser um painel quadrado, ele deverá
  // ser a interface toda do 'início'") — saudação, status da rota, ETA
  // e os controles da viagem (botão deslizante, estilo Uber) flutuam
  // por cima do mapa em cartões, em vez de empurrar o mapa pra uma
  // caixinha fixa de 180pt como antes.
  const mapSectionHeight = Math.max(windowHeight * 0.65, 420);

  return (
    <View style={[styles.opScreen, { backgroundColor: theme.colors.background }]}>
      <ScrollView contentContainerStyle={styles.opScrollContent}>
        <View style={[styles.mapSection, { height: mapSectionHeight }]}>
          <View style={styles.absoluteFill}>
            {markers.length > 0 ? (
              <RottaMap
                key={mapKey}
                markers={markers}
                route={paradasOrdenadas.map((p) => ({
                  latitude: p.latitude,
                  longitude: p.longitude,
                }))}
                initialZoom={12}
              />
            ) : (
              <MeuMapa
                location={minhaLocalizacao.location}
                status={minhaLocalizacao.status}
                fill
                mapKey={mapKey}
              />
            )}
          </View>

          <View
            style={[styles.topOverlay, { top: insets.top + theme.spacing[3] }]}
            pointerEvents="box-none"
          >
            <View
              style={[
                styles.overlayCard,
                { backgroundColor: theme.colors.surfaceElevated, borderRadius: theme.radius.lg },
                theme.elevation.dropdown.native,
              ]}
            >
              <PanelGreeting nome={user?.nome ?? ""} />
            </View>
            {/*
              Cartão "De/Para" (Frente Q, imagem de referência de app de
              navegação: "Your location" -> "Select destinations"). De:
              sempre "Você"; Para: a próxima parada com ETA
              (`useTripProximasEtas`, já real) — só cai no nome da rota
              quando a viagem ainda nem começou.
            */}
            <RouteFromToCard
              origemLabel="Você"
              destinoLabel={proximaParada ? proximaParada.endereco : rota.nome}
              chips={
                proximaParada && distanciaProximaParada
                  ? [
                      { label: "Distância", value: distanciaProximaParada },
                      { label: "Turno", value: TURNO_LABEL[rota.turno] ?? rota.turno },
                    ]
                  : undefined
              }
              rightSlot={
                <View style={styles.overlayActions}>
                  {trip ? (
                    <StatusPill
                      label={TRIP_STATUS_LABEL[trip.status]?.label ?? trip.status}
                      tone={TRIP_STATUS_LABEL[trip.status]?.tone ?? "neutral"}
                    />
                  ) : null}
                  {showTrocarRota ? (
                    <Pressable onPress={onTrocarRota} accessibilityRole="button">
                      <Text
                        style={{ color: theme.colors.primary, fontSize: 13, fontWeight: "600" }}
                      >
                        Trocar
                      </Text>
                    </Pressable>
                  ) : null}
                </View>
              }
            />
          </View>

          <RecenterButton
            onPress={() => setMapKey((k) => k + 1)}
            style={{
              position: "absolute",
              right: 16,
              top: insets.top + theme.spacing[3] + 140,
            }}
          />

          <View
            style={[
              styles.bottomPanel,
              {
                backgroundColor: theme.colors.surfaceElevated,
                borderTopLeftRadius: theme.radius.xl,
                borderTopRightRadius: theme.radius.xl,
              },
              theme.elevation.modal.native,
            ]}
          >
            {proximaParada ? (
              <ProximaParadaEtaCard eta={proximaParada} parada={proximaParadaStop} />
            ) : null}

            {isLoadingTrip ? (
              <ActivityIndicator color={theme.colors.primary} />
            ) : !trip ? (
              isMotorista ? (
                <SlideToAction
                  label="Deslize para iniciar viagem"
                  theme={theme}
                  onComplete={() => startTrip.mutate({ routeId: rota.id })}
                  isLoading={startTrip.isPending}
                />
              ) : (
                <Text style={[styles.painelTexto, { color: theme.colors.textMuted }]}>
                  Nenhuma viagem registrada hoje. Aguardando o motorista iniciar.
                </Text>
              )
            ) : trip.status === "FINALIZADA" || trip.status === "CANCELADA" ? (
              <Text style={[styles.painelTexto, { color: theme.colors.textMuted }]}>
                A viagem de hoje já foi {trip.status === "FINALIZADA" ? "finalizada" : "cancelada"}.
              </Text>
            ) : isMotorista ? (
              <>
                {gpsAvisoTexto ? (
                  <Text style={{ color: theme.colors.textMuted, fontSize: 12 }}>
                    {gpsAvisoTexto}
                  </Text>
                ) : null}
                {isActive ? (
                  <>
                    <VehicleButton
                      label="Pausar"
                      variant="secondary"
                      icon={<Pause size={16} color={theme.colors.text} />}
                      onPress={() => pauseTrip.mutate(trip.id)}
                      isLoading={pauseTrip.isPending}
                    />
                    <SlideToAction
                      label="Deslize para finalizar viagem"
                      theme={theme}
                      thumbColor={theme.colors.danger}
                      onComplete={() => finishTrip.mutate(trip.id)}
                      isLoading={finishTrip.isPending}
                    />
                  </>
                ) : (
                  <>
                    <SlideToAction
                      label="Deslize para retomar viagem"
                      theme={theme}
                      onComplete={() => resumeTrip.mutate(trip.id)}
                      isLoading={resumeTrip.isPending}
                    />
                    <VehicleButton
                      label="Finalizar viagem"
                      variant="secondary"
                      icon={<Square size={16} color={theme.colors.text} />}
                      onPress={() => finishTrip.mutate(trip.id)}
                      isLoading={finishTrip.isPending}
                    />
                  </>
                )}
              </>
            ) : (
              <Text style={[styles.painelTexto, { color: theme.colors.textMuted }]}>
                Viagem em andamento. Só o motorista inicia, pausa ou finaliza.
              </Text>
            )}
          </View>
        </View>

        {trip && trip.status !== "FINALIZADA" && trip.status !== "CANCELADA" ? (
          <View style={styles.paradasSection}>
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
          </View>
        ) : null}
      </ScrollView>
    </View>
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
  absoluteFill: { ...StyleSheet.absoluteFillObject },
  alunoActions: { flexDirection: "row", gap: 16 },
  alunoRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    paddingVertical: 6,
  },
  ausenciaForm: { alignItems: "center" },
  bottomPanel: {
    bottom: 0,
    gap: 12,
    left: 0,
    padding: 16,
    position: "absolute",
    right: 0,
  },
  etaCard: { alignItems: "center", flexDirection: "row", gap: 12 },
  etaHorario: { alignItems: "center", flexDirection: "row", gap: 4 },
  mapSection: { overflow: "hidden", position: "relative", width: "100%" },
  mapa: { borderRadius: 12, height: 180, overflow: "hidden" },
  mapaVazio: { alignItems: "center", gap: 8, height: 180, justifyContent: "center" },
  mapaVazioFill: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    gap: 8,
    justifyContent: "center",
    padding: 16,
  },
  navegarButton: {
    alignItems: "center",
    borderRadius: 999,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  opScreen: { flex: 1 },
  opScrollContent: { flexGrow: 1 },
  overlayActions: { alignItems: "center", flexDirection: "row", gap: 12 },
  overlayCard: { padding: 16 },
  painelTexto: { paddingVertical: 8, textAlign: "center" },
  paradaHeader: { alignItems: "flex-start", flexDirection: "row", gap: 8 },
  paradasSection: { gap: 16, padding: 24 },
  secao: { fontSize: 16, fontWeight: "700" },
  titulo: { fontSize: 18, fontWeight: "700" },
  topOverlay: { gap: 12, left: 16, position: "absolute", right: 16 },
});
