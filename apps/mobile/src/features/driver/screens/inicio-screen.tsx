import { useAuth } from "@rotta/auth/native";
import {
  AlertTriangle,
  Check,
  Clock,
  MapPin,
  MessageCircle,
  Navigation,
  Pause,
  Play,
  Timer,
  Users,
  UserX,
  X,
} from "@rotta/icons/native";
import { RottaMap, type RottaMapMarker } from "@rotta/maps/native";
import { buildNavigationUrl } from "@rotta/maps/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
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

import { RecenterButton } from "@/components/route-screen-chrome";
import { SlideToAction } from "@/components/slide-to-action";
import { useGpsTrack } from "@/features/gps/hooks/use-gps";
import { useUnreadNotificationsCount } from "@/features/notifications/hooks/use-notifications";
import {
  StatusPill,
  VehicleButton,
  VehicleCard,
  VehicleScreen,
} from "@/features/vehicles/components";
import {
  useCreateVehicleOccurrence,
  useVehicleOccurrences,
} from "@/features/vehicles/hooks/use-vehicles";
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
function ProximaParadaEtaCard({
  eta,
  parada,
  accentColor,
}: {
  eta: NextEta;
  parada?: RouteStop;
  accentColor: string;
}): JSX.Element {
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
      <Navigation size={20} color={accentColor} />
      <View style={{ flex: 1 }}>
        <Text style={{ color: theme.colors.textMuted, fontSize: 11 }}>Próxima parada</Text>
        <Text style={{ color: theme.colors.text, fontWeight: "600" }}>{eta.endereco}</Text>
      </View>
      <View style={{ alignItems: "flex-end", gap: 2 }}>
        <View style={styles.etaHorario}>
          <Clock size={12} color={accentColor} />
          <Text style={{ color: accentColor, fontWeight: "600", fontSize: 13 }}>
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

/**
 * Cronômetro da viagem ativa (paridade com o Painel Web, Frente do
 * redesenho pedido pelo usuário — modelo de referência "Viagem ativa")
 * — porta exata de `TripElapsedTimer`: conta a partir de
 * `trip.iniciadaEm` (dado real do backend), pausa visualmente quando
 * a viagem está `PAUSADA`.
 */
function TripElapsedTimer({
  iniciadaEm,
  isRunning,
  accentColor,
}: {
  iniciadaEm: string;
  isRunning: boolean;
  accentColor: string;
}): JSX.Element {
  const { theme } = useTheme();
  const [agora, setAgora] = useState(() => Date.now());

  useEffect(() => {
    if (!isRunning) return;
    const id = setInterval(() => setAgora(Date.now()), 1000);
    return () => clearInterval(id);
  }, [isRunning]);

  const decorridoMs = Math.max(0, agora - new Date(iniciadaEm).getTime());
  const totalSegundos = Math.floor(decorridoMs / 1000);
  const horas = Math.floor(totalSegundos / 3600);
  const minutos = Math.floor((totalSegundos % 3600) / 60);
  const segundos = totalSegundos % 60;
  const texto =
    horas > 0
      ? `${horas}:${String(minutos).padStart(2, "0")}:${String(segundos).padStart(2, "0")}`
      : `${minutos}:${String(segundos).padStart(2, "0")}`;

  return (
    <View style={styles.timerRow}>
      <Timer size={20} color={isRunning ? accentColor : theme.colors.textMuted} />
      <Text style={[styles.timerTexto, { color: theme.colors.text }]}>{texto}</Text>
      {!isRunning ? (
        <Text style={{ color: theme.colors.textMuted, fontSize: 12 }}>pausada</Text>
      ) : null}
    </View>
  );
}

/**
 * "Resumo da viagem" (paridade com o Painel Web) — 4 números reais:
 * Alunos embarcados (`TripStudentEvent` real), Paradas restantes
 * (calculado a partir dos eventos já registrados), Ocorrências hoje
 * (`VehicleOccurrence` do veículo, filtrado pro dia — mesma
 * aproximação honesta do web: não existe modelo de ocorrência por
 * viagem) e Mensagens (notificações não lidas reais). Sem navegação
 * cruzada de aba ainda (nenhum padrão estabelecido no app pra isso) —
 * tiles informativos, não tocáveis.
 */
function TripStatsGrid({
  totalAlunos,
  alunosEmbarcados,
  paradasRestantes,
  veiculoId,
  accentColor,
}: {
  totalAlunos: number;
  alunosEmbarcados: number;
  paradasRestantes: number;
  veiculoId: string;
  accentColor: string;
}): JSX.Element {
  const { theme } = useTheme();
  const { data: occurrences } = useVehicleOccurrences(veiculoId);
  const { data: unreadCount } = useUnreadNotificationsCount();

  const hojeISO = new Date().toISOString().slice(0, 10);
  const ocorrenciasHoje =
    occurrences?.items.filter((item) => item.createdAt.slice(0, 10) === hojeISO).length ?? 0;

  const tiles = [
    { label: "Alunos embarcados", valor: `${alunosEmbarcados}/${totalAlunos}`, icon: Users },
    { label: "Paradas restantes", valor: String(paradasRestantes), icon: MapPin },
    { label: "Ocorrências hoje", valor: String(ocorrenciasHoje), icon: AlertTriangle },
    { label: "Mensagens", valor: String(unreadCount ?? 0), icon: MessageCircle },
  ];

  return (
    <View style={styles.statsGrid}>
      {tiles.map((tile) => (
        <View
          key={tile.label}
          style={[
            styles.statsTile,
            { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
          ]}
        >
          <View style={styles.statsTileHeader}>
            <tile.icon size={16} color={accentColor} />
            <Text style={{ color: theme.colors.textMuted, fontSize: 11 }}>{tile.label}</Text>
          </View>
          <Text style={{ color: theme.colors.text, fontWeight: "700", fontSize: 16 }}>
            {tile.valor}
          </Text>
        </View>
      ))}
    </View>
  );
}

/**
 * "Alunos a bordo" (paridade com o Painel Web — tela do Monitor) —
 * consolida quem já embarcou e ainda não desembarcou nesta viagem, sem
 * precisar abrir cada parada uma por uma. Dado real
 * (`TripStudentEvent`), nunca inferido.
 */
function AlunosABordoCard({
  routeStudents,
  eventos,
  accentColor,
}: {
  routeStudents: RouteStudent[];
  eventos: TripStudentEvent[];
  accentColor: string;
}): JSX.Element | null {
  const { theme } = useTheme();
  const aBordo = routeStudents.filter((aluno) => {
    const doAluno = eventos.filter((e) => e.studentId === aluno.studentId);
    const embarcou = doAluno.some((e) => e.tipo === "EMBARCOU");
    const desembarcou = doAluno.some((e) => e.tipo === "DESEMBARCOU");
    return embarcou && !desembarcou;
  });

  if (aBordo.length === 0) return null;

  return (
    <VehicleCard>
      <View style={styles.paradaHeader}>
        <Users size={16} color={accentColor} />
        <Text style={{ color: theme.colors.text, fontWeight: "600" }}>
          Alunos a bordo ({aBordo.length})
        </Text>
      </View>
      {aBordo.map((aluno) => (
        <AlunoABordoRow key={aluno.id} studentId={aluno.studentId} />
      ))}
    </VehicleCard>
  );
}

function AlunoABordoRow({ studentId }: { studentId: string }): JSX.Element {
  const { theme } = useTheme();
  const { data: student } = useStudent(studentId);
  return (
    <View style={styles.alunoABordoRow}>
      <View style={[styles.alunoABordoDot, { backgroundColor: theme.colors.success }]} />
      <Text style={{ color: theme.colors.text }}>{student?.nome ?? "Carregando…"}</Text>
    </View>
  );
}

/**
 * "Registrar ocorrência" (3 imagens de referência anexadas pelo
 * usuário, tela do Monitor — pedido explícito "quero o mesmo design,
 * idêntico") — mesmo endpoint já usado em "Meu Veículo" (`POST
 * /vehicles/:id/occurrences`, já libera MOTORISTA/MONITOR no backend).
 *
 * Redesenho (Frente 304, paridade com o Painel Web — que trocou o
 * `Modal` por uma rota `/ocorrencia` própria): o `DriverNavigator` é um
 * Bottom Tab Navigator sem Stack aninhada em "Início", então criar uma
 * rota nova exigiria reestruturar a navegação inteira — em vez disso,
 * o MESMO `Modal` nativo do RN agora renderiza EM TELA CHEIA
 * (`transparent={false}`, cabeçalho fixo com botão de voltar), visual e
 * funcionalmente indistinguível de uma página própria pra quem usa o
 * app, sem o risco de mexer no navigator pra chegar lá.
 */
function RegistrarOcorrenciaButton({
  veiculoId,
  accentColor,
}: {
  veiculoId: string;
  accentColor: string;
}): JSX.Element {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [isOpen, setIsOpen] = useState(false);
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const createOccurrence = useCreateVehicleOccurrence(veiculoId);

  function fechar(): void {
    setIsOpen(false);
    setTitulo("");
    setDescricao("");
  }

  return (
    <>
      <VehicleButton
        label="Registrar ocorrência"
        variant="secondary"
        icon={<AlertTriangle size={16} color={accentColor} />}
        onPress={() => setIsOpen(true)}
      />

      <Modal visible={isOpen} animationType="slide" onRequestClose={fechar}>
        <View style={[styles.ocorrenciaScreen, { backgroundColor: theme.colors.background }]}>
          <View style={[styles.ocorrenciaHeader, { paddingTop: insets.top + theme.spacing[3] }]}>
            <Pressable accessibilityRole="button" accessibilityLabel="Voltar" onPress={fechar}>
              <X size={22} color={theme.colors.text} />
            </Pressable>
            <Text style={{ color: theme.colors.text, fontWeight: "700", fontSize: 18 }}>
              Ocorrência
            </Text>
          </View>

          <ScrollView contentContainerStyle={styles.ocorrenciaBody}>
            <Text style={{ color: theme.colors.textMuted, fontSize: 12 }}>Título</Text>
            <TextInput
              value={titulo}
              onChangeText={setTitulo}
              placeholder="Ex.: Pneu furado, aluno passou mal…"
              style={[
                styles.modalInput,
                { color: theme.colors.text, borderColor: theme.colors.border },
              ]}
              placeholderTextColor={theme.colors.textMuted}
            />

            <Text style={{ color: theme.colors.textMuted, fontSize: 12 }}>Descrição</Text>
            <TextInput
              value={descricao}
              onChangeText={setDescricao}
              multiline
              placeholder="Descreva o que aconteceu"
              style={[
                styles.modalInput,
                styles.modalTextArea,
                { color: theme.colors.text, borderColor: theme.colors.border },
              ]}
              placeholderTextColor={theme.colors.textMuted}
            />

            <VehicleButton
              label="Reportar ocorrência"
              variant="primary"
              isLoading={createOccurrence.isPending}
              onPress={() => {
                if (!titulo || !descricao) return;
                createOccurrence.mutate({ titulo, descricao }, { onSuccess: fechar });
              }}
            />
            <VehicleButton label="Cancelar" variant="secondary" onPress={fechar} />
          </ScrollView>
        </View>
      </Modal>
    </>
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
  // Cor de papel (Frente 304 — 3 imagens de referência anexadas pelo
  // usuário, pedido explícito "quero o mesmo design, idêntico"):
  // Motorista reaproveita `primary` (já azul); Monitor usa o novo
  // `monitorAccent` (roxo, ver `packages/theme/src/tokens/colors.ts`).
  const accentColor = isMotorista ? theme.colors.primary : theme.colors.monitorAccent;

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

  // Marcador do próprio veículo em movimento (Frente 2, paridade com o
  // Painel Web — pedido do usuário: "todos deverão ter mapa, cada um na
  // sua função") — só as paradas estáticas apareciam aqui até agora.
  // `GET /gps/trips/:tripId/track` é o único endpoint de GPS que
  // Motorista/Monitor podem chamar sobre a própria viagem; pega a
  // posição mais recente da trilha. Só busca enquanto a viagem de hoje
  // ainda não terminou.
  const gpsTrackTripId =
    trip && trip.status !== "FINALIZADA" && trip.status !== "CANCELADA" ? trip.id : undefined;
  const { data: gpsTrack } = useGpsTrack(gpsTrackTripId);
  const veiculoMarker: RottaMapMarker | null = useMemo(() => {
    const ultimaPosicao =
      gpsTrack && gpsTrack.length > 0 ? gpsTrack[gpsTrack.length - 1] : undefined;
    if (!ultimaPosicao) return null;
    return {
      id: "veiculo-em-movimento",
      titulo: "Seu veículo",
      latitude: ultimaPosicao.latitude,
      longitude: ultimaPosicao.longitude,
      emMovimento: true,
    };
  }, [gpsTrack]);
  const mapMarkers: RottaMapMarker[] = veiculoMarker ? [...markers, veiculoMarker] : markers;

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

  const gpsAvisoTexto =
    gpsStatus === "reporting"
      ? "Compartilhando sua localização com os responsáveis."
      : gpsStatus === "requesting"
        ? "Solicitando permissão de localização…"
        : gpsStatus === "denied"
          ? "Localização negada. Os responsáveis não verão o veículo no mapa até você permitir."
          : null;

  // Números reais do "Resumo da viagem" (paridade com o Painel Web) —
  // mesma regra que já decide o ícone de cada `AlunoParadaRow` abaixo.
  const alunosEmbarcados = (studentEvents ?? []).filter((e) => e.tipo === "EMBARCOU").length;
  const paradasRestantesCount = paradasOrdenadas.filter((parada) => {
    const alunosDaParada = (routeStudents ?? []).filter(
      (aluno) => aluno.paradaEmbarqueId === parada.id || aluno.paradaDesembarqueId === parada.id,
    );
    if (alunosDaParada.length === 0) return false;
    return alunosDaParada.some((aluno) => {
      const isEmbarque = aluno.paradaEmbarqueId === parada.id;
      const tipoEsperado = isEmbarque ? "EMBARCOU" : "DESEMBARCOU";
      const jaResolvido = (studentEvents ?? []).some(
        (e) => e.studentId === aluno.studentId && (e.tipo === tipoEsperado || e.tipo === "AUSENTE"),
      );
      return !jaResolvido;
    });
  }).length;

  const viagemEncerrada = trip && (trip.status === "FINALIZADA" || trip.status === "CANCELADA");
  const totalAlunos = (routeStudents ?? []).length;
  const progressoEmbarquePct = totalAlunos > 0 ? (alunosEmbarcados / totalAlunos) * 100 : 0;

  return (
    <View style={[styles.opScreen, { backgroundColor: theme.colors.background }]}>
      <ScrollView contentContainerStyle={styles.opScrollContent}>
        <PanelGreeting nome={user?.nome ?? ""} />

        {/*
          Mapa em CARTÃO, não em tela cheia (3 imagens de referência
          anexadas pelo usuário — nenhuma delas mostra o mapa como fundo
          da tela inteira; Frente P4/P5 revertidas aqui).
        */}
        <View
          style={[
            styles.mapCard,
            { backgroundColor: theme.colors.card, borderColor: theme.colors.border },
          ]}
        >
          <View style={styles.mapCardMap}>
            {markers.length > 0 ? (
              <RottaMap
                key={mapKey}
                markers={mapMarkers}
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
            <RecenterButton
              onPress={() => setMapKey((k) => k + 1)}
              style={{ position: "absolute", right: 8, bottom: 8 }}
            />
          </View>
          <View style={styles.mapCardBody}>
            <View style={styles.mapCardBodyRow}>
              <Text style={{ color: theme.colors.text, fontWeight: "700", fontSize: 15 }}>
                {rota.nome}
              </Text>
              {trip ? (
                <StatusPill
                  label={TRIP_STATUS_LABEL[trip.status]?.label ?? trip.status}
                  tone={TRIP_STATUS_LABEL[trip.status]?.tone ?? "neutral"}
                />
              ) : (
                <Text style={{ color: theme.colors.textMuted, fontSize: 12 }}>
                  {TURNO_LABEL[rota.turno] ?? rota.turno}
                </Text>
              )}
            </View>
            <Text style={{ color: theme.colors.textMuted, fontSize: 12 }}>
              {proximaParada
                ? `Próxima parada: ${proximaParada.endereco}`
                : `${paradasOrdenadas.length} paradas nesta rota`}
            </Text>
            {showTrocarRota ? (
              <Pressable onPress={onTrocarRota} accessibilityRole="button">
                <Text style={{ color: accentColor, fontSize: 13, fontWeight: "600" }}>
                  Trocar rota
                </Text>
              </Pressable>
            ) : null}
          </View>
        </View>

        {/*
          "Próxima viagem" (modelo de referência) — veículo + alunos
          confirmados ANTES de apertar "Iniciar viagem".
        */}
        {!trip ? (
          <VehicleCard style={styles.proximaViagemCard}>
            <Text style={{ color: theme.colors.text, fontWeight: "700" }}>Próxima viagem</Text>
            <View style={styles.mapCardBodyRow}>
              <Text style={{ color: theme.colors.textMuted, fontSize: 12 }}>
                {totalAlunos} alunos confirmados
              </Text>
            </View>
          </VehicleCard>
        ) : null}

        {/*
          "Viagem ativa" (modelo de referência) — cronômetro grande +
          resumo de 4 números só com a viagem já rodando ou pausada.
        */}
        {trip && (trip.status === "EM_ANDAMENTO" || trip.status === "PAUSADA") ? (
          <VehicleCard style={styles.statsCard}>
            <TripElapsedTimer
              iniciadaEm={trip.iniciadaEm}
              isRunning={isActive}
              accentColor={accentColor}
            />
            <TripStatsGrid
              totalAlunos={totalAlunos}
              alunosEmbarcados={alunosEmbarcados}
              paradasRestantes={paradasRestantesCount}
              veiculoId={trip.veiculoId}
              accentColor={accentColor}
            />
          </VehicleCard>
        ) : null}

        {proximaParada ? (
          <ProximaParadaEtaCard
            eta={proximaParada}
            parada={proximaParadaStop}
            accentColor={accentColor}
          />
        ) : null}

        {/*
          Controles da viagem — o botão deslizante voltou (pedido do
          usuário, reafirmado depois da Frente P5/302-304: "com o botão
          deslizante para iniciar a viagem e finalizar também", "para
          todas as plataformas, TODAS, sem exceção"). Só iniciar/encerrar
          usam `SlideToAction` — evita o disparo acidental que esses dois
          causariam sozinhos; pausar/retomar continuam botão comum, ação
          reversível.
        */}
        <View style={styles.controlsSection}>
          {isLoadingTrip ? (
            <ActivityIndicator color={accentColor} />
          ) : !trip ? (
            isMotorista ? (
              <SlideToAction
                label="Deslize para iniciar a viagem"
                theme={theme}
                onComplete={() => startTrip.mutate({ routeId: rota.id })}
                isLoading={startTrip.isPending}
              />
            ) : (
              <Text style={[styles.painelTexto, { color: theme.colors.textMuted }]}>
                Nenhuma viagem registrada hoje. Aguardando o motorista iniciar.
              </Text>
            )
          ) : viagemEncerrada ? (
            <Text style={[styles.painelTexto, { color: theme.colors.textMuted }]}>
              A viagem de hoje já foi {trip.status === "FINALIZADA" ? "finalizada" : "cancelada"}.
            </Text>
          ) : isMotorista ? (
            <>
              {gpsAvisoTexto ? (
                <Text style={{ color: theme.colors.textMuted, fontSize: 12 }}>{gpsAvisoTexto}</Text>
              ) : null}
              {isActive ? (
                <View style={styles.controlsRow}>
                  <VehicleButton
                    label="Pausar"
                    variant="secondary"
                    icon={<Pause size={16} color={theme.colors.text} />}
                    onPress={() => pauseTrip.mutate(trip.id)}
                    isLoading={pauseTrip.isPending}
                  />
                  <View style={{ flex: 1 }}>
                    <SlideToAction
                      label="Deslize para encerrar"
                      theme={theme}
                      onComplete={() => finishTrip.mutate(trip.id)}
                      isLoading={finishTrip.isPending}
                      thumbColor={theme.colors.danger}
                    />
                  </View>
                </View>
              ) : (
                <View style={styles.controlsRow}>
                  <VehicleButton
                    label="Retomar"
                    variant="secondary"
                    icon={<Play size={16} color={theme.colors.text} />}
                    onPress={() => resumeTrip.mutate(trip.id)}
                    isLoading={resumeTrip.isPending}
                  />
                  <View style={{ flex: 1 }}>
                    <SlideToAction
                      label="Deslize para finalizar"
                      theme={theme}
                      onComplete={() => finishTrip.mutate(trip.id)}
                      isLoading={finishTrip.isPending}
                      thumbColor={theme.colors.danger}
                    />
                  </View>
                </View>
              )}
            </>
          ) : (
            <Text style={[styles.painelTexto, { color: theme.colors.textMuted }]}>
              Viagem em andamento. Só o motorista inicia, pausa ou finaliza.
            </Text>
          )}
        </View>

        {trip && !viagemEncerrada ? (
          <View style={styles.paradasSection}>
            <AlunosABordoCard
              routeStudents={routeStudents ?? []}
              eventos={studentEvents ?? []}
              accentColor={accentColor}
            />
            <RegistrarOcorrenciaButton veiculoId={trip.veiculoId} accentColor={accentColor} />

            <View style={styles.mapCardBodyRow}>
              <Text style={[styles.secao, { color: theme.colors.text }]}>Paradas</Text>
              <Text style={{ color: theme.colors.textMuted, fontSize: 12 }}>
                {alunosEmbarcados}/{totalAlunos} embarcados
              </Text>
            </View>
            <View style={[styles.progressoTrilha, { backgroundColor: theme.colors.muted }]}>
              <View
                style={[
                  styles.progressoBarra,
                  { backgroundColor: accentColor, width: `${progressoEmbarquePct}%` },
                ]}
              />
            </View>

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
  alunoABordoDot: { borderRadius: 999, height: 8, width: 8 },
  alunoABordoRow: { alignItems: "center", flexDirection: "row", gap: 8, paddingVertical: 4 },
  alunoActions: { flexDirection: "row", gap: 16 },
  alunoRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    paddingVertical: 6,
  },
  ausenciaForm: { alignItems: "center" },
  controlsRow: { flexDirection: "row", gap: 8 },
  controlsSection: { gap: 8, paddingHorizontal: 16 },
  etaCard: { alignItems: "center", flexDirection: "row", gap: 12 },
  etaHorario: { alignItems: "center", flexDirection: "row", gap: 4 },
  mapCard: { borderRadius: 16, borderWidth: 1, margin: 16, overflow: "hidden" },
  mapCardBody: { gap: 4, padding: 12 },
  mapCardBodyRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    justifyContent: "space-between",
  },
  mapCardMap: { height: 208, position: "relative", width: "100%" },
  mapa: { borderRadius: 12, height: 180, overflow: "hidden" },
  mapaVazio: { alignItems: "center", gap: 8, height: 180, justifyContent: "center" },
  mapaVazioFill: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    gap: 8,
    justifyContent: "center",
    padding: 16,
  },
  modalInput: {
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
    padding: 10,
  },
  modalTextArea: { minHeight: 80, textAlignVertical: "top" },
  navegarButton: {
    alignItems: "center",
    borderRadius: 999,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  ocorrenciaBody: { gap: 4, padding: 16 },
  ocorrenciaHeader: {
    flexDirection: "row",
    gap: 12,
    paddingBottom: 12,
    paddingHorizontal: 16,
  },
  ocorrenciaScreen: { flex: 1 },
  opScreen: { flex: 1 },
  opScrollContent: { flexGrow: 1, paddingBottom: 24 },
  painelTexto: { paddingVertical: 8, textAlign: "center" },
  paradaHeader: { alignItems: "flex-start", flexDirection: "row", gap: 8 },
  paradasSection: { gap: 16, paddingHorizontal: 16 },
  progressoBarra: { borderRadius: 999, height: "100%" },
  progressoTrilha: { borderRadius: 999, height: 6, overflow: "hidden", width: "100%" },
  proximaViagemCard: { marginHorizontal: 16 },
  secao: { fontSize: 16, fontWeight: "700" },
  statsCard: { marginHorizontal: 16 },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  statsTile: {
    borderRadius: 16,
    borderWidth: 1,
    flexBasis: "47%",
    flexGrow: 1,
    gap: 4,
    padding: 12,
  },
  statsTileHeader: { alignItems: "center", flexDirection: "row", gap: 6 },
  timerRow: { alignItems: "center", flexDirection: "row", gap: 8 },
  timerTexto: { fontSize: 28, fontVariant: ["tabular-nums"], fontWeight: "700" },
  titulo: { fontSize: 18, fontWeight: "700" },
});
