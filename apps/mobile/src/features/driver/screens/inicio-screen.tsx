import { MOTIVO_AUSENCIA_PRESETS } from "@rotta/api-client";
import { useAuth } from "@rotta/auth/native";
import {
  AlertTriangle,
  Check,
  ChevronDown,
  ChevronUp,
  Clock,
  LogIn,
  LogOut,
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
import {
  estaProximo,
  haversineDistanceMeters,
  type DistanceCoordenada,
} from "@rotta/maps/distance";
import { RottaMap, type RottaMapMarker } from "@rotta/maps/native";
import { buildNavigationUrl } from "@rotta/maps/navigation";
import { driverShadow } from "@rotta/theme";
import { activateKeepAwakeAsync, deactivateKeepAwake } from "expo-keep-awake";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  LayoutAnimation,
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
  useRouteStudentsDetalhado,
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
  useTripStudentLocations,
} from "../hooks/use-driver-trip";
import { useMyLocation, type MyLocation, type MyLocationStatus } from "../hooks/use-my-location";
import { useTripGpsReporting } from "../hooks/use-trip-gps-reporting";

import type {
  NextEta,
  Route,
  RouteStop,
  RouteStudent,
  RouteStudentDetalhado,
  Trip,
  TripStudentEvent,
} from "@rotta/api-client";
import type { ReactNode } from "react";

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
      <VehicleScreen backgroundColor={theme.colors.driverBackground}>
        <ActivityIndicator color={theme.colors.driverPrimary} />
      </VehicleScreen>
    );
  }

  if (rotas.length === 0) {
    return (
      <VehicleScreen backgroundColor={theme.colors.driverBackground}>
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
      <VehicleScreen backgroundColor={theme.colors.driverBackground}>
        <PanelGreeting nome={user?.nome ?? ""} />
        <Text style={[styles.titulo, { color: theme.colors.text }]}>Suas rotas</Text>
        {rotas.map((rota) => (
          <Pressable key={rota.id} onPress={() => setSelectedRouteId(rota.id)}>
            <VehicleCard
              style={[
                styles.driverCard,
                { backgroundColor: theme.colors.surfaceElevated },
                driverShadow[theme.name].native,
              ]}
            >
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
            <ActivityIndicator color={theme.colors.driverPrimary} />
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
            // Mesmo ícone de veículo do mapa em operação (auditoria
            // 27/08/2026) — esta tela também é só de
            // motorista/monitor/autônomo/MEI, nunca de Responsável, então
            // "Você está aqui" É o veículo, não um pino genérico.
            emMovimento: true,
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
/**
 * Uma linha por aluno no card "Próxima viagem" (pedido do usuário:
 * "aparecerá as informações — nome dos alunos, escolas, horário,
 * bairros, responsáveis"). Todo campo de `RouteStudentDetalhado` é
 * opcional (join que pode falhar isoladamente no backend) — nunca
 * mostra um traço genérico, só omite a informação que não veio.
 */
function AlunoPreViagemRow({ aluno }: { aluno: RouteStudentDetalhado }): JSX.Element {
  const { theme } = useTheme();
  const subtitulo = [aluno.schoolNome, aluno.bairro].filter(Boolean).join(" · ");
  return (
    <View style={[styles.alunoPreViagemRow, { backgroundColor: theme.colors.surface }]}>
      <View style={{ flex: 1 }}>
        <View style={styles.alunoPreViagemHeaderRow}>
          <Text style={{ color: theme.colors.text, fontWeight: "600", fontSize: 13 }}>
            {aluno.studentNome ?? "Aluno"}
          </Text>
          {aluno.horarioPrevisto ? (
            <Text style={{ color: theme.colors.textMuted, fontSize: 11 }}>
              {aluno.horarioPrevisto}
            </Text>
          ) : null}
        </View>
        {subtitulo ? (
          <Text style={{ color: theme.colors.textMuted, fontSize: 12 }}>{subtitulo}</Text>
        ) : null}
        {aluno.responsavelNome ? (
          <Text style={{ color: theme.colors.textMuted, fontSize: 12 }}>
            Responsável: {aluno.responsavelNome}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

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
    <VehicleCard
      style={[
        styles.etaCard,
        styles.driverCard,
        { backgroundColor: theme.colors.surfaceElevated },
        driverShadow[theme.name].native,
      ]}
    >
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
          <Navigation size={16} color={theme.colors.driverPrimary} />
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
      <View style={[styles.alunoABordoDot, { backgroundColor: theme.colors.driverSuccess }]} />
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
  const isMonitor = user?.role === "monitor";
  // Cor de papel (Frente 304 — 3 imagens de referência anexadas pelo
  // usuário, pedido explícito "quero o mesmo design, idêntico"):
  // Motorista usa `driverPrimary` (azul da identidade nova do
  // Motorista, spec 31/08/2026); Monitor mantém o `monitorAccent`
  // (roxo, ver `packages/theme/src/tokens/colors.ts`) — cor exclusiva
  // já existente, não substituída pela nova identidade.
  const accentColor = isMotorista ? theme.colors.driverPrimary : theme.colors.monitorAccent;

  const { data: trip, isLoading: isLoadingTrip } = useTodayTrip(rota.id);
  const { data: stops } = useRouteStops(rota.id);
  const { data: routeStudents } = useRouteStudents(rota.id);
  const { data: studentEvents } = useTripStudentEvents(trip?.id);
  // Card "Próxima viagem" (pedido do usuário: "aparecerá as informações
  // — nome dos alunos, escolas, horário, bairros, responsáveis") — só
  // busca antes da viagem existir, mesma regra de outros hooks
  // condicionais nesta tela.
  const { data: routeStudentsDetalhado } = useRouteStudentsDetalhado(!trip ? rota.id : undefined);

  const startTrip = useStartTrip(rota.id);
  const pauseTrip = usePauseTrip(rota.id);
  const resumeTrip = useResumeTrip(rota.id);
  const finishTrip = useFinishTrip(rota.id);

  const isActive = trip?.status === "EM_ANDAMENTO";
  // Correção 31/08/2026 (pedido do usuário: "Monitor e Motorista
  // integrados? Ações integradas?") — só o Motorista reportava GPS,
  // apesar do backend (`TripsService.assertCanOperateTrip`) já liberar
  // o Monitor pra `ingestPosition` desde a Frente AA. Mesma paridade do
  // Painel Web (`minha-rota/page.tsx`).
  const podeReportarGps = isMotorista || isMonitor;
  const { status: gpsStatus } = useTripGpsReporting(
    podeReportarGps && isActive && trip ? trip.id : null,
  );

  // Mantém a tela acesa durante a viagem (pedido do usuário: "manter a
  // tela do motorista ligada... tanto no app quanto na web") — paridade
  // com `useWakeLock` já usado no Painel Web (`minha-rota/page.tsx`),
  // mesmo escopo do reporte de GPS acima (Motorista OU Monitor), só
  // enquanto a viagem está `EM_ANDAMENTO`. `expo-keep-awake` já era uma
  // dependência instalada, mas nunca chamada em lugar nenhum — sem isso,
  // o celular apaga a tela sozinho e o app para de reportar GPS/mostrar
  // o checklist até alguém desbloquear de novo (mesmo problema que
  // motivou o hook web).
  useEffect(() => {
    if (!podeReportarGps || !isActive) return;
    const tag = "rotta-viagem-ativa";
    void activateKeepAwakeAsync(tag);
    return () => void deactivateKeepAwake(tag);
  }, [podeReportarGps, isActive]);

  const paradasOrdenadas = [...(stops ?? [])].sort((a, b) => a.ordem - b.ordem);
  const markers: RottaMapMarker[] = paradasOrdenadas.map((parada) => ({
    id: parada.id,
    titulo: `${parada.ordem}. ${parada.endereco}`,
    latitude: parada.latitude,
    longitude: parada.longitude,
  }));

  // Respaldo (Frente M, mesma regra da Frente I no Painel Web): sem
  // paradas cadastradas ainda pra essa rota, mostra pelo menos onde o
  // telefone está — nunca deixa a tela sem mapa nenhum. Também alimenta
  // o marcador do veículo abaixo (auditoria 27/08/2026, pedido do
  // usuário: "o motorista e monitor deverão saber onde estão. Cadê o
  // 'veículo' no mapa dos motoristas e monitores?") — por isso agora
  // fica sempre ligado nesta tela, não só quando faltam paradas.
  const minhaLocalizacao = useMyLocation(true);

  // Marcador do próprio veículo em movimento (Frente 2, paridade com o
  // Painel Web — pedido do usuário: "todos deverão ter mapa, cada um na
  // sua função"; reforçado na auditoria 27/08/2026 — "motorista e
  // monitor deverão saber onde estão"). `GET /gps/trips/:tripId/track`
  // é o único endpoint de GPS que Motorista/Monitor podem chamar sobre
  // a própria viagem — mas essa trilha só existe DEPOIS que o backend
  // já recebeu pelo menos 1 relatório (viagem `EM_ANDAMENTO`), então o
  // próprio motorista/monitor ficava sem se ver no mapa antes disso (e
  // sempre, se a viagem ainda nem começou). O marcador agora prioriza a
  // posição do PRÓPRIO telefone (`minhaLocalizacao`, instantânea, watch
  // contínuo, nunca depende de a viagem estar rodando) — a trilha do
  // backend só entra como respaldo se a localização do telefone ainda
  // não estiver disponível (permissão sendo solicitada/negada).
  const gpsTrackTripId =
    trip && trip.status !== "FINALIZADA" && trip.status !== "CANCELADA" ? trip.id : undefined;
  const { data: gpsTrack } = useGpsTrack(gpsTrackTripId);
  const ultimaPosicao = gpsTrack && gpsTrack.length > 0 ? gpsTrack[gpsTrack.length - 1] : undefined;
  const veiculoPosicao = minhaLocalizacao.location
    ? {
        latitude: minhaLocalizacao.location.latitude,
        longitude: minhaLocalizacao.location.longitude,
      }
    : ultimaPosicao
      ? { latitude: ultimaPosicao.latitude, longitude: ultimaPosicao.longitude }
      : null;
  // Deps em primitivos (não o objeto `veiculoPosicao`, recriado a cada
  // render) — senão o `useMemo` recalcula sempre, mesmo sem mudança real.
  const veiculoLatitude = veiculoPosicao?.latitude;
  const veiculoLongitude = veiculoPosicao?.longitude;
  const veiculoMarker: RottaMapMarker | null = useMemo(() => {
    if (veiculoLatitude === undefined || veiculoLongitude === undefined) return null;
    return {
      id: "veiculo-em-movimento",
      titulo: "Seu veículo",
      latitude: veiculoLatitude,
      longitude: veiculoLongitude,
      emMovimento: true,
    };
  }, [veiculoLatitude, veiculoLongitude]);
  const mapMarkers: RottaMapMarker[] = veiculoMarker ? [...markers, veiculoMarker] : markers;

  // Posição do veículo, pro gate de proximidade (Frente 2, paridade com
  // o Painel Web — pedido do usuário: "ao chegar próximo — raio de até
  // 1km — poderá embarcar/desembarcar o aluno"). Sempre a trilha
  // VERIFICADA pelo backend (nunca a leitura crua do telefone de quem
  // está olhando a tela agora — pode ser o Monitor, num aparelho
  // diferente do que de fato reporta GPS pra viagem): é a posição do
  // VEÍCULO que importa aqui pro gate. `null` sem posição conhecida
  // ainda — `estaProximo` nunca bloqueia nesse caso.
  const driverPosition: DistanceCoordenada | null = ultimaPosicao
    ? { latitude: ultimaPosicao.latitude, longitude: ultimaPosicao.longitude }
    : null;
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
      : gpsStatus === "reporting-foreground-only"
        ? 'Compartilhando localização só com o app aberto — permita "Sempre" nas configurações para continuar com o app em segundo plano.'
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

  // Frente AP (paridade com o Painel Web, pedido do usuário: "quando a
  // pessoa for iniciar uma rota, deverá ter um veículo cadastrado —
  // caso o motorista não tenha, o pop-up deverá informar isso") —
  // mesma checagem proativa do lado web: sem `rota.veiculoPadraoId`, o
  // backend rejeitaria `POST /trips/start` de qualquer forma
  // (`"Informe veiculoId..."`, hoje visível via o `Alert` global de
  // erro), mas essa mensagem é pensada pra quem chama a API, não pra
  // quem dirige.
  const semVeiculoPadrao = !isLoadingTrip && !trip && isMotorista && !rota.veiculoPadraoId;
  const isDono = user?.role === "empresa";
  const [avisoSemVeiculoAberto, setAvisoSemVeiculoAberto] = useState(false);
  useEffect(() => {
    if (semVeiculoPadrao) setAvisoSemVeiculoAberto(true);
  }, [semVeiculoPadrao]);

  // Frente AP (paridade com o Painel Web — pedido do usuário: "o mapa
  // inteiro na tela... com um retângulo com borda redonda flutuante...
  // com os alunos, com um botão do lado - azul (embarque), vermelho
  // (desembarque)... mostra a próxima rota traçada... quando todos, a
  // próxima rota será a escola"). Continua enquanto existir uma viagem
  // não encerrada (inclusive `PAUSADA`) — pro Motorista E o Monitor.
  if (trip && !viagemEncerrada) {
    return (
      <ModoOperacionalFullScreen
        rota={rota}
        trip={trip}
        accentColor={accentColor}
        isMotorista={isMotorista}
        isActive={isActive}
        mapMarkers={mapMarkers}
        paradasOrdenadas={paradasOrdenadas}
        driverPosition={driverPosition}
        routeStudents={routeStudents ?? []}
        studentEvents={studentEvents ?? []}
        proximasEtas={proximasEtas ?? []}
        alunosEmbarcados={alunosEmbarcados}
        totalAlunos={totalAlunos}
        gpsAvisoTexto={gpsAvisoTexto}
        pauseTrip={pauseTrip}
        resumeTrip={resumeTrip}
        finishTrip={finishTrip}
        mapKey={mapKey}
        onRecenter={() => setMapKey((k) => k + 1)}
      />
    );
  }

  return (
    <View style={[styles.opScreen, { backgroundColor: theme.colors.driverBackground }]}>
      <Modal
        visible={avisoSemVeiculoAberto}
        transparent
        animationType="fade"
        onRequestClose={() => setAvisoSemVeiculoAberto(false)}
      >
        <View style={styles.avisoVeiculoOverlay}>
          <View
            style={[styles.avisoVeiculoCard, { backgroundColor: theme.colors.surfaceElevated }]}
          >
            <View
              style={[styles.avisoVeiculoIcone, { backgroundColor: `${theme.colors.warning}1A` }]}
            >
              <AlertTriangle size={20} color={theme.colors.warning} />
            </View>
            <Text style={{ color: theme.colors.text, fontWeight: "700", fontSize: 16 }}>
              Nenhum veículo cadastrado
            </Text>
            <Text style={{ color: theme.colors.textMuted, textAlign: "center" }}>
              {isDono
                ? "Esta rota ainda não tem um veículo vinculado. Cadastre um veículo pelo Painel Web antes de iniciar a viagem."
                : "Esta rota ainda não tem um veículo vinculado. Fale com sua transportadora para vincular um antes de iniciar a viagem."}
            </Text>
            <VehicleButton
              label="Entendi"
              variant="primary"
              onPress={() => setAvisoSemVeiculoAberto(false)}
            />
          </View>
        </View>
      </Modal>

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
            {/* Código único da viagem (pedido do usuário: "o código da viagem - único") — só existe depois que a viagem já foi iniciada. */}
            {trip ? (
              <Text
                style={{ color: theme.colors.textMuted, fontSize: 12, fontFamily: "monospace" }}
              >
                Código da viagem: {trip.codigo}
              </Text>
            ) : null}
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
          <VehicleCard
            style={[
              styles.proximaViagemCard,
              styles.driverCard,
              { backgroundColor: theme.colors.surfaceElevated },
              driverShadow[theme.name].native,
            ]}
          >
            <Text style={{ color: theme.colors.text, fontWeight: "700" }}>Próxima viagem</Text>
            <View style={styles.mapCardBodyRow}>
              <Text style={{ color: theme.colors.textMuted, fontSize: 12 }}>
                {totalAlunos} alunos confirmados
              </Text>
            </View>
            {/*
              Lista detalhada por aluno (pedido do usuário: "aparecerá
              as informações — nome dos alunos, escolas, horário,
              bairros, responsáveis. Embaixo dessas informações, deverá
              ter o botão deslizante para iniciar a viagem/rota") — o
              botão deslizante em si já vive mais abaixo nesta mesma
              tela, fora deste cartão.
            */}
            {routeStudentsDetalhado && routeStudentsDetalhado.length > 0 ? (
              <View style={[styles.alunosPreViagemList, { borderTopColor: theme.colors.border }]}>
                {routeStudentsDetalhado.map((aluno) => (
                  <AlunoPreViagemRow key={aluno.id} aluno={aluno} />
                ))}
              </View>
            ) : null}
          </VehicleCard>
        ) : null}

        {/*
          "Viagem ativa" (modelo de referência) — cronômetro grande +
          resumo de 4 números só com a viagem já rodando ou pausada.
        */}
        {trip && (trip.status === "EM_ANDAMENTO" || trip.status === "PAUSADA") ? (
          <VehicleCard
            style={[
              styles.statsCard,
              styles.driverCard,
              { backgroundColor: theme.colors.surfaceElevated },
              driverShadow[theme.name].native,
            ]}
          >
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
              semVeiculoPadrao ? (
                <Text style={[styles.painelTexto, { color: theme.colors.textMuted }]}>
                  Esta rota ainda não tem um veículo cadastrado.{" "}
                  {isDono
                    ? "Cadastre um veículo antes de iniciar a viagem."
                    : "Fale com sua transportadora para vincular um veículo a esta rota."}
                </Text>
              ) : (
                <SlideToAction
                  label="Deslize para iniciar a viagem"
                  theme={theme}
                  onComplete={() => startTrip.mutate({ routeId: rota.id })}
                  isLoading={startTrip.isPending}
                />
              )
            ) : (
              <Text style={[styles.painelTexto, { color: theme.colors.textMuted }]}>
                Nenhuma viagem registrada hoje. Aguardando o motorista iniciar.
              </Text>
            )
          ) : viagemEncerrada ? (
            isMotorista ? (
              // Pedido do usuário: "rotas não são feitas para ser
              // finalizadas concretamente... são finalizadas
              // temporariamente até o transportador acionar de novo" —
              // a rota continua disponível pra outra viagem no mesmo
              // dia (ida de manhã, volta à tarde, por exemplo).
              <View style={{ gap: 8 }}>
                <Text style={[styles.painelTexto, { color: theme.colors.textMuted }]}>
                  A viagem de hoje já foi{" "}
                  {trip.status === "FINALIZADA" ? "finalizada" : "cancelada"}. A rota continua
                  disponível — pode iniciar outra viagem quando precisar.
                </Text>
                <SlideToAction
                  label="Deslize para iniciar outra viagem"
                  theme={theme}
                  onComplete={() => startTrip.mutate({ routeId: rota.id })}
                  isLoading={startTrip.isPending}
                />
              </View>
            ) : (
              <Text style={[styles.painelTexto, { color: theme.colors.textMuted }]}>
                A viagem de hoje já foi {trip.status === "FINALIZADA" ? "finalizada" : "cancelada"}.
              </Text>
            )
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
                      danger
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
                      danger
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
                driverPosition={driverPosition}
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
  driverPosition,
}: {
  parada: RouteStop;
  alunos: RouteStudent[];
  eventos: TripStudentEvent[];
  tripId: string;
  podeOperar: boolean;
  driverPosition: DistanceCoordenada | null;
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
            driverPosition={driverPosition}
          />
        ))
      )}
    </VehicleCard>
  );
}

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

/**
 * Frente AP (mobile) — tela cheia do Modo Ação depois que a viagem
 * existe, porta exata da lógica já usada no Painel Web
 * (`ModoOperacionalFullScreen`, `apps/web/.../minha-rota/page.tsx`).
 * Mesma regra de reaproveitamento: `AlunoParadaRow` (raio de 1km) e
 * `useTripProximasEtas` (ETA real, já reordenado por proximidade) já
 * existiam — a escola no final não precisa de regra nova, é só a última
 * parada pendente dessa mesma lista quando só sobra desembarque.
 */
function ModoOperacionalFullScreen({
  rota,
  trip,
  accentColor,
  isMotorista,
  isActive,
  mapMarkers,
  paradasOrdenadas,
  driverPosition,
  routeStudents,
  studentEvents,
  proximasEtas,
  alunosEmbarcados,
  totalAlunos,
  gpsAvisoTexto,
  pauseTrip,
  resumeTrip,
  finishTrip,
  mapKey,
  onRecenter,
}: {
  rota: Route;
  trip: Trip;
  accentColor: string;
  isMotorista: boolean;
  isActive: boolean;
  mapMarkers: RottaMapMarker[];
  paradasOrdenadas: RouteStop[];
  driverPosition: DistanceCoordenada | null;
  routeStudents: RouteStudent[];
  studentEvents: TripStudentEvent[];
  proximasEtas: NextEta[];
  alunosEmbarcados: number;
  totalAlunos: number;
  gpsAvisoTexto: string | null;
  pauseTrip: ReturnType<typeof usePauseTrip>;
  resumeTrip: ReturnType<typeof useResumeTrip>;
  finishTrip: ReturnType<typeof useFinishTrip>;
  mapKey: number;
  onRecenter: () => void;
}): JSX.Element {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  // Mesmo filtro de "falta o evento esperado" usado em `paradasRestantesCount`/`ParadaCard`.
  const paradasPendentes = paradasOrdenadas.filter((parada) => {
    const alunosDaParada = routeStudents.filter(
      (aluno) => aluno.paradaEmbarqueId === parada.id || aluno.paradaDesembarqueId === parada.id,
    );
    if (alunosDaParada.length === 0) return false;
    return alunosDaParada.some((aluno) => {
      const isEmbarque = aluno.paradaEmbarqueId === parada.id;
      const tipoEsperado = isEmbarque ? "EMBARCOU" : "DESEMBARCOU";
      const resolvido = studentEvents.some(
        (e) => e.studentId === aluno.studentId && (e.tipo === tipoEsperado || e.tipo === "AUSENTE"),
      );
      return !resolvido;
    });
  });

  const proximaEta = proximasEtas[0];
  const paradaAlvo = proximaEta
    ? (paradasOrdenadas.find((p) => p.id === proximaEta.routeStopId) ?? paradasPendentes[0])
    : paradasPendentes[0];

  const alunosDaParadaAlvo = paradaAlvo
    ? routeStudents.filter(
        (aluno) =>
          aluno.paradaEmbarqueId === paradaAlvo.id || aluno.paradaDesembarqueId === paradaAlvo.id,
      )
    : [];

  const chegouNaEscola =
    alunosDaParadaAlvo.length > 0 &&
    alunosDaParadaAlvo.every((aluno) => aluno.paradaDesembarqueId === paradaAlvo?.id);

  const rotaTracada =
    paradaAlvo && driverPosition
      ? [driverPosition, { latitude: paradaAlvo.latitude, longitude: paradaAlvo.longitude }]
      : paradasOrdenadas.map((p) => ({ latitude: p.latitude, longitude: p.longitude }));

  const distanciaAteAlvo =
    driverPosition && paradaAlvo
      ? haversineDistanceMeters(driverPosition, {
          latitude: paradaAlvo.latitude,
          longitude: paradaAlvo.longitude,
        })
      : null;

  function handleNavegar(): void {
    if (!paradaAlvo) return;
    const app = Platform.OS === "ios" ? "apple" : "google";
    const url = buildNavigationUrl(
      { latitude: paradaAlvo.latitude, longitude: paradaAlvo.longitude },
      app,
    );
    Linking.openURL(url).catch(() => {
      // Sem app de mapas instalado/URL recusada — sem fallback silencioso.
    });
  }

  // Pedido do usuário: "a lista de alunos deverá aparecer completa
  // durante a viagem, não somente o da parada atual" — paridade exata
  // com o Painel Web (`verTodosAlunos` em `minha-rota/page.tsx`). Dobra
  // também de "está expandido?" pro bottom sheet (spec do Motorista,
  // 31/08/2026): o mesmo botão que mostra o roster inteiro é o que
  // deixa o cartão mais alto — não são dois controles independentes.
  const [verTodosAlunos, setVerTodosAlunos] = useState(false);

  function handleToggleExpanded(): void {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setVerTodosAlunos((v) => !v);
  }

  return (
    <View style={[styles.fsRoot, { backgroundColor: theme.colors.driverBackground }]}>
      <View style={styles.fsMapArea}>
        {mapMarkers.length > 0 ? (
          <RottaMap
            key={mapKey}
            markers={mapMarkers}
            route={rotaTracada}
            initialZoom={13}
            // "Mapa em modo GPS" (Frente 4, mesma paridade do Painel Web
            // — pedido do usuário: "podendo centralizar o mapa de acordo
            // com a rota do veículo").
            followMode
          />
        ) : (
          <View style={styles.fsMapLoading}>
            <ActivityIndicator color={accentColor} />
          </View>
        )}

        <View style={[styles.fsTopBar, { top: insets.top + 8 }]}>
          <View
            style={[
              styles.fsTopPill,
              { backgroundColor: theme.colors.surfaceElevated },
              driverShadow[theme.name].native,
            ]}
          >
            <View
              style={[
                styles.fsStatusDot,
                { backgroundColor: isActive ? accentColor : theme.colors.textMuted },
              ]}
            />
            <Text
              numberOfLines={1}
              style={{ color: theme.colors.text, fontWeight: "700", fontSize: 13, maxWidth: 110 }}
            >
              {rota.nome}
            </Text>
            <TripElapsedTimer
              iniciadaEm={trip.iniciadaEm}
              isRunning={isActive}
              accentColor={accentColor}
            />
          </View>
          <View style={styles.fsTopBarActions}>
            <RecenterButton onPress={onRecenter} />
          </View>
        </View>

        {gpsAvisoTexto ? (
          <View style={[styles.fsGpsAviso, { top: insets.top + 60 }]}>
            <Text
              style={[
                styles.fsGpsAvisoTexto,
                { color: theme.colors.textMuted, backgroundColor: theme.colors.surfaceElevated },
              ]}
            >
              {gpsAvisoTexto}
            </Text>
          </View>
        ) : null}
      </View>

      <OperationalBottomSheet expanded={verTodosAlunos} onToggleExpanded={handleToggleExpanded}>
        <View style={styles.mapCardBodyRow}>
          <Pressable
            onPress={handleToggleExpanded}
            style={{ alignItems: "center", flexDirection: "row", gap: 6 }}
          >
            <Users size={14} color={theme.colors.textMuted} />
            <Text style={{ color: theme.colors.textMuted, fontSize: 12 }}>
              {alunosEmbarcados}/{totalAlunos} embarcados ·{" "}
              {verTodosAlunos ? "ocultar todos" : "ver todos"}
            </Text>
          </Pressable>
          {/* Pedido do usuário: "o botão de pausar rota deverá sair de
              onde está, pois ele está muito difícil de ser clicado" —
              antes era um círculo pequeno flutuando por cima do mapa
              (`fsRoundButton`), competindo por toque com o próprio gesto
              de arrastar/dar zoom no mapa. Movido pra dentro do cartão,
              mesmo `VehicleButton` já usado no modo não-tela-cheia —
              alvo de toque bem maior. */}
          {isMotorista ? (
            <VehicleButton
              label={isActive ? "Pausar" : "Retomar"}
              variant="secondary"
              icon={
                isActive ? (
                  <Pause size={16} color={theme.colors.text} />
                ) : (
                  <Play size={16} color={theme.colors.text} />
                )
              }
              onPress={() => (isActive ? pauseTrip.mutate(trip.id) : resumeTrip.mutate(trip.id))}
              isLoading={pauseTrip.isPending || resumeTrip.isPending}
            />
          ) : null}
          <RegistrarOcorrenciaButton veiculoId={trip.veiculoId} accentColor={accentColor} />
        </View>

        {paradaAlvo ? (
          <View style={{ gap: 12 }}>
            <View style={[styles.fsAlvoHeader, { borderTopColor: theme.colors.border }]}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: theme.colors.textMuted, fontSize: 11 }}>
                  {chegouNaEscola ? "Próximo destino · Escola" : "Próxima parada"}
                </Text>
                <Text style={{ color: theme.colors.text, fontWeight: "600" }}>
                  {paradaAlvo.ordem}. {paradaAlvo.endereco}
                </Text>
                {proximaEta ? (
                  <Text style={{ color: theme.colors.textMuted, fontSize: 12 }}>
                    {new Date(proximaEta.etaPrevista).toLocaleTimeString("pt-BR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}{" "}
                    · {formatarDistancia(proximaEta.distanciaMetros)}
                  </Text>
                ) : distanciaAteAlvo !== null ? (
                  <Text style={{ color: theme.colors.textMuted, fontSize: 12 }}>
                    {formatarDistancia(distanciaAteAlvo)}
                  </Text>
                ) : null}
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Navegar até a próxima parada"
                onPress={handleNavegar}
                style={[styles.navegarButton, { backgroundColor: theme.colors.primaryMuted }]}
              >
                <Navigation size={16} color={theme.colors.driverPrimary} />
              </Pressable>
            </View>

            {alunosDaParadaAlvo.map((aluno) => (
              <AlunoParadaRow
                key={aluno.id}
                aluno={aluno}
                parada={paradaAlvo}
                eventos={studentEvents}
                tripId={trip.id}
                podeOperar={isActive}
                driverPosition={driverPosition}
              />
            ))}
          </View>
        ) : (
          <View style={[styles.fsConcluido, { borderTopColor: theme.colors.border }]}>
            <Check size={28} color={theme.colors.driverSuccess} />
            <Text style={{ color: theme.colors.text, fontWeight: "600" }}>
              Todos os alunos foram desembarcados.
            </Text>
            {isMotorista ? (
              <View style={{ paddingTop: 8, width: "100%" }}>
                <SlideToAction
                  label="Deslize para finalizar"
                  theme={theme}
                  onComplete={() => finishTrip.mutate(trip.id)}
                  isLoading={finishTrip.isPending}
                  danger
                />
              </View>
            ) : (
              <Text style={{ color: theme.colors.textMuted, fontSize: 12 }}>
                Aguardando o motorista finalizar a viagem.
              </Text>
            )}
          </View>
        )}

        {verTodosAlunos ? (
          <View style={[styles.rosterCompleto, { borderTopColor: theme.colors.border }]}>
            <Text style={{ color: theme.colors.textMuted, fontSize: 11 }}>
              Todas as paradas da rota
            </Text>
            {paradasOrdenadas.map((parada) => (
              <ParadaCard
                key={parada.id}
                parada={parada}
                alunos={routeStudents.filter(
                  (aluno) =>
                    aluno.paradaEmbarqueId === parada.id || aluno.paradaDesembarqueId === parada.id,
                )}
                eventos={studentEvents}
                tripId={trip.id}
                podeOperar={isActive}
                driverPosition={driverPosition}
              />
            ))}
          </View>
        ) : null}
      </OperationalBottomSheet>
    </View>
  );
}

/**
 * Bottom sheet ANCORADO na base do mapa em tela cheia (spec do
 * Motorista, 31/08/2026 — substitui o cartão flutuante arrastável
 * anterior). Dois estados de altura (compacto ~63% / expandido ~88% da
 * tela), acionados pelo botão de seta OU pelo link "ver todos" — o
 * mesmo `expanded` controla os dois, igual à referência do usuário
 * (`view-all-button onClick={() => setExpanded(true)}`).
 * `LayoutAnimation` (chamado pelo pai antes de trocar `expanded`) anima
 * a transição de altura sem precisar de `Animated`/gesture-handler
 * novo — mesma decisão de não adicionar dependência só pra isto.
 * Nunca cobre a barra de navegação inferior: como as demais telas do
 * Motorista, isto é conteúdo normal da aba "Início" (React Navigation
 * já reserva a altura da tab bar por fora), não um modal/overlay
 * absoluto por cima de tudo.
 */
function OperationalBottomSheet({
  expanded,
  onToggleExpanded,
  children,
}: {
  expanded: boolean;
  onToggleExpanded: () => void;
  children: ReactNode;
}): JSX.Element {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const ChevronIcon = expanded ? ChevronDown : ChevronUp;

  return (
    <View
      style={[
        styles.opSheet,
        {
          maxHeight: SCREEN_HEIGHT * (expanded ? 0.88 : 0.63),
          paddingBottom: insets.bottom + 12,
          backgroundColor: theme.colors.surfaceElevated,
        },
        driverShadow[theme.name].native,
      ]}
    >
      <View style={styles.opSheetHandleRow}>
        <View style={[styles.opSheetHandle, { backgroundColor: theme.colors.border }]} />
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={expanded ? "Recolher" : "Expandir"}
        onPress={onToggleExpanded}
        style={[styles.opSheetExpandButton, { backgroundColor: theme.colors.muted }]}
      >
        <ChevronIcon size={18} color={theme.colors.textMuted} />
      </Pressable>
      <ScrollView style={styles.opSheetScroll} contentContainerStyle={styles.opSheetContent}>
        {children}
      </ScrollView>
    </View>
  );
}

/** "350m"/"1,2km" — mesmo padrão de arredondamento do Painel Web. */
function formatarDistancia(metros: number): string {
  if (metros < 1000) return `${Math.round(metros)}m`;
  return `${(metros / 1000).toFixed(1).replace(".", ",")}km`;
}

function AlunoParadaRow({
  aluno,
  parada,
  eventos,
  tripId,
  podeOperar,
  driverPosition,
}: {
  aluno: RouteStudent;
  parada: RouteStop;
  eventos: TripStudentEvent[];
  tripId: string;
  podeOperar: boolean;
  driverPosition: DistanceCoordenada | null;
}): JSX.Element {
  const { theme } = useTheme();
  const { data: student } = useStudent(aluno.studentId);
  const addEvent = useAddStudentEvent(tripId);
  const [formularioAusenciaAberto, setFormularioAusenciaAberto] = useState(false);
  const [motivoAusencia, setMotivoAusencia] = useState("");

  const isEmbarque = aluno.paradaEmbarqueId === parada.id;
  const tipo = isEmbarque ? "EMBARCOU" : "DESEMBARCOU";
  const jaEmbarcou = eventos.some((e) => e.studentId === aluno.studentId && e.tipo === "EMBARCOU");
  const jaOcorreu = eventos.some((e) => e.studentId === aluno.studentId && e.tipo === tipo);
  const jaAusente = eventos.some((e) => e.studentId === aluno.studentId && e.tipo === "AUSENTE");

  // Item 3 do pedido do usuário: "reconhecer o endereço alternativo do
  // responsável dentro do raio de embarque/desembarque" — quando este
  // aluno tem um `StudentAddressOverride` ativo hoje pro trecho atual,
  // `useTripStudentLocations` já devolve a coordenada EFETIVA (a casa
  // alternativa, não a `RouteStop` física); sem desvio, cai pra própria
  // parada (mesmo comportamento de antes).
  const { data: studentLocations } = useTripStudentLocations(tripId);
  const localizacaoEfetiva = studentLocations?.find(
    (loc) =>
      loc.studentId === aluno.studentId && loc.tipo === (isEmbarque ? "EMBARQUE" : "DESEMBARQUE"),
  );

  // Gate de proximidade (Frente 2, pedido do usuário: "ao chegar próximo
  // — um raio de até 1km — poderá embarcar/desembarcar o aluno daquela
  // localidade"). Sem posição conhecida ainda, `estaProximo` responde
  // `true` (nunca trava o motorista por o GPS ainda não ter reportado).
  const paradaCoordenada: DistanceCoordenada = localizacaoEfetiva
    ? { latitude: localizacaoEfetiva.latitude, longitude: localizacaoEfetiva.longitude }
    : { latitude: parada.latitude, longitude: parada.longitude };
  const distanciaMetros = driverPosition
    ? haversineDistanceMeters(driverPosition, paradaCoordenada)
    : null;
  const perto = estaProximo(driverPosition, paradaCoordenada);
  // Desembarque só é possível depois de um embarque registrado nesta viagem (mesma regra do backend).
  const elegivel = !jaOcorreu && !jaAusente && (isEmbarque || jaEmbarcou);
  const podeRegistrar = podeOperar && elegivel && perto;
  const longeDemais = podeOperar && elegivel && !perto;

  function handleConfirmarAusencia(): void {
    addEvent.mutate(
      {
        studentId: aluno.studentId,
        tipo: "AUSENTE",
        motivoAusencia: motivoAusencia.trim() || undefined,
      },
      {
        onSuccess: () => {
          setFormularioAusenciaAberto(false);
          setMotivoAusencia("");
        },
      },
    );
  }

  return (
    // Epic C (Responsável marcou "meu filho não vai hoje" — ou o
    // motorista/monitor confirmou a ausência): pedido literal do usuário
    // ("o aluno vai ficar meio opaco") — a linha INTEIRA fica esmaecida,
    // não só o texto do botão trocado por "Ausente".
    <View style={[styles.alunoRowContainer, jaAusente && { opacity: 0.5 }]}>
      <View style={styles.alunoRow}>
        <Text style={{ color: theme.colors.text, flex: 1 }}>
          {isEmbarque ? "Embarque" : "Desembarque"}: {student?.nome ?? "Carregando…"}
        </Text>
        {jaOcorreu ? (
          <Check size={18} color={theme.colors.driverSuccess} />
        ) : jaAusente ? (
          <Text style={{ color: theme.colors.driverDanger, fontSize: 12 }}>Ausente</Text>
        ) : !formularioAusenciaAberto ? (
          <View style={styles.alunoActions}>
            <Pressable
              accessibilityRole="button"
              disabled={!podeRegistrar || addEvent.isPending}
              onPress={() => addEvent.mutate({ studentId: aluno.studentId, tipo })}
              style={[
                styles.alunoActionButton,
                {
                  backgroundColor: isEmbarque
                    ? theme.colors.driverPrimary
                    : theme.colors.driverDanger,
                  opacity: podeRegistrar ? 1 : 0.4,
                },
              ]}
            >
              {addEvent.isPending ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  {isEmbarque ? (
                    <LogIn size={16} color="#FFFFFF" />
                  ) : (
                    <LogOut size={16} color="#FFFFFF" />
                  )}
                  <Text style={styles.alunoActionButtonLabel}>
                    {isEmbarque ? "Embarque" : "Desembarque"}
                  </Text>
                </>
              )}
            </Pressable>
            {isEmbarque ? (
              <Pressable
                accessibilityRole="button"
                disabled={!podeOperar}
                onPress={() => setFormularioAusenciaAberto(true)}
                style={{ opacity: podeOperar ? 1 : 0.4 }}
              >
                <UserX size={20} color={theme.colors.driverDanger} />
              </Pressable>
            ) : null}
          </View>
        ) : null}
      </View>

      {/* Pedido do usuário: "um formulário simples e opcional (motivo
          com opções ou comentário, ambos opcionais)" — nada aqui é
          obrigatório pra confirmar a ausência. */}
      {formularioAusenciaAberto && isEmbarque ? (
        <View style={[styles.ausenciaForm, { backgroundColor: theme.colors.muted }]}>
          <Text style={{ color: theme.colors.textMuted, fontSize: 12 }}>
            Motivo da ausência (opcional)
          </Text>
          <View style={styles.ausenciaPresetsRow}>
            {MOTIVO_AUSENCIA_PRESETS.map((preset) => (
              <Pressable
                key={preset}
                onPress={() => setMotivoAusencia(preset)}
                style={[
                  styles.ausenciaPresetChip,
                  {
                    borderColor:
                      motivoAusencia === preset ? theme.colors.driverDanger : theme.colors.border,
                    backgroundColor:
                      motivoAusencia === preset ? `${theme.colors.driverDanger}1a` : "transparent",
                  },
                ]}
              >
                <Text
                  style={{
                    fontSize: 12,
                    color:
                      motivoAusencia === preset
                        ? theme.colors.driverDanger
                        : theme.colors.textMuted,
                  }}
                >
                  {preset}
                </Text>
              </Pressable>
            ))}
          </View>
          <TextInput
            value={motivoAusencia}
            onChangeText={setMotivoAusencia}
            placeholder="Ou escreva um comentário (opcional)"
            placeholderTextColor={theme.colors.textMuted}
            maxLength={500}
            style={[
              styles.ausenciaInput,
              { color: theme.colors.text, borderColor: theme.colors.border },
            ]}
          />
          <View style={styles.ausenciaActionsRow}>
            <Pressable
              accessibilityRole="button"
              disabled={addEvent.isPending}
              onPress={handleConfirmarAusencia}
              style={styles.ausenciaConfirmButton}
            >
              {addEvent.isPending ? (
                <ActivityIndicator size="small" color={theme.colors.driverDanger} />
              ) : (
                <Text style={{ color: theme.colors.driverDanger, fontSize: 13, fontWeight: "600" }}>
                  Confirmar ausência
                </Text>
              )}
            </Pressable>
            <Pressable
              onPress={() => {
                setFormularioAusenciaAberto(false);
                setMotivoAusencia("");
              }}
            >
              <Text style={{ color: theme.colors.textMuted, fontSize: 12 }}>Cancelar</Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      {longeDemais ? (
        <Text style={{ color: theme.colors.textMuted, fontSize: 12 }}>
          Aproxime-se até 1km do local para liberar o botão
          {distanciaMetros !== null ? ` (você está a ${formatarDistancia(distanciaMetros)})` : ""}.
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  absoluteFill: { ...StyleSheet.absoluteFillObject },
  alunoABordoDot: { borderRadius: 999, height: 8, width: 8 },
  alunoABordoRow: { alignItems: "center", flexDirection: "row", gap: 8, paddingVertical: 4 },
  alunoActionButton: {
    alignItems: "center",
    borderRadius: 999,
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  alunoActionButtonLabel: { color: "#FFFFFF", fontSize: 13, fontWeight: "600" },
  alunoActions: { alignItems: "center", flexDirection: "row", gap: 16 },
  alunoPreViagemHeaderRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    justifyContent: "space-between",
  },
  alunoPreViagemRow: {
    borderRadius: 12,
    flexDirection: "row",
    gap: 8,
    padding: 10,
  },
  alunoRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
  },
  alunoRowContainer: { gap: 4, paddingVertical: 6 },
  alunosPreViagemList: { borderTopWidth: 1, gap: 8, paddingTop: 12 },
  ausenciaActionsRow: { alignItems: "center", flexDirection: "row", gap: 16, paddingTop: 2 },
  ausenciaConfirmButton: { paddingVertical: 4 },
  ausenciaForm: { borderRadius: 16, gap: 8, padding: 12 },
  ausenciaInput: {
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 13,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  ausenciaPresetChip: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  ausenciaPresetsRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  avisoVeiculoCard: {
    borderRadius: 20,
    gap: 12,
    padding: 20,
    width: "100%",
  },
  avisoVeiculoIcone: {
    alignItems: "center",
    alignSelf: "center",
    borderRadius: 999,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  avisoVeiculoOverlay: {
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
    flex: 1,
    justifyContent: "center",
    padding: 24,
  },
  controlsRow: { flexDirection: "row", gap: 8 },
  controlsSection: { gap: 8, paddingHorizontal: 16 },
  // Identidade do Motorista/Monitor (spec 31/08/2026: "sombras discretas
  // em vez de bordas") — sobrescreve a `borderWidth: 1` padrão de
  // `VehicleCard` (`style` é aplicado por último no array de estilos dele).
  driverCard: { borderRadius: 24, borderWidth: 0 },
  etaCard: { alignItems: "center", flexDirection: "row", gap: 12 },
  etaHorario: { alignItems: "center", flexDirection: "row", gap: 4 },
  fsAlvoHeader: {
    alignItems: "flex-start",
    borderTopWidth: 1,
    flexDirection: "row",
    gap: 12,
    paddingTop: 12,
  },
  fsConcluido: { alignItems: "center", borderTopWidth: 1, gap: 8, paddingVertical: 16 },
  fsGpsAviso: { alignItems: "center", left: 12, position: "absolute", right: 12 },
  fsGpsAvisoTexto: {
    borderRadius: 999,
    fontSize: 12,
    overflow: "hidden",
    paddingHorizontal: 12,
    paddingVertical: 4,
    textAlign: "center",
  },
  fsMapArea: { flex: 1, position: "relative" },
  fsMapLoading: { alignItems: "center", flex: 1, justifyContent: "center" },
  fsRoot: { flex: 1 },
  fsStatusDot: { borderRadius: 999, height: 8, width: 8 },
  fsTopBar: {
    alignItems: "flex-start",
    flexDirection: "row",
    justifyContent: "space-between",
    left: 12,
    position: "absolute",
    right: 12,
  },
  fsTopBarActions: { flexDirection: "row", gap: 8 },
  fsTopPill: {
    alignItems: "center",
    borderRadius: 999,
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
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
  opSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 8,
  },
  opSheetContent: { gap: 4, paddingBottom: 4, paddingHorizontal: 16 },
  opSheetExpandButton: {
    alignItems: "center",
    borderRadius: 999,
    height: 32,
    justifyContent: "center",
    position: "absolute",
    right: 16,
    top: 8,
    width: 32,
  },
  opSheetHandle: { borderRadius: 999, height: 4, width: 40 },
  opSheetHandleRow: { alignItems: "center", paddingBottom: 8 },
  opSheetScroll: { flexGrow: 0 },
  painelTexto: { paddingVertical: 8, textAlign: "center" },
  paradaHeader: { alignItems: "flex-start", flexDirection: "row", gap: 8 },
  paradasSection: { gap: 16, paddingHorizontal: 16 },
  progressoBarra: { borderRadius: 999, height: "100%" },
  progressoTrilha: { borderRadius: 999, height: 6, overflow: "hidden", width: "100%" },
  proximaViagemCard: { marginHorizontal: 16 },
  rosterCompleto: { borderTopWidth: 1, gap: 10, paddingTop: 12 },
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
