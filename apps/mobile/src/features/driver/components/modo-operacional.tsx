import { MOTIVO_AUSENCIA_PRESETS } from "@rotta/api-client";
import {
  Check,
  ChevronDown,
  ChevronUp,
  LogIn,
  LogOut,
  MapPin,
  Navigation,
  Pause,
  Play,
  Users,
  UserX,
} from "@rotta/icons/native";
import {
  estaProximo,
  haversineDistanceMeters,
  type DistanceCoordenada,
} from "@rotta/maps/distance";
import { RottaMap, type RottaMapMarker } from "@rotta/maps/native";
import { buildNavigationUrl } from "@rotta/maps/navigation";
import { driverShadow } from "@rotta/theme";
import { useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  LayoutAnimation,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useStudent } from "../hooks/use-driver-routes";
import {
  useAddStudentEvent,
  useStudentsAttendanceToday,
  useTripStudentLocations,
} from "../hooks/use-driver-trip";

import { RegistrarOcorrenciaButton, TripElapsedTimer } from "./inicio-cards";
import { inicioStyles } from "./inicio-styles";

import type { useFinishTrip, usePauseTrip, useResumeTrip } from "../hooks/use-driver-trip";
import type {
  NextEta,
  Route,
  RouteStop,
  RouteStudent,
  Trip,
  TripStudentEvent,
} from "@rotta/api-client";
import type { ReactNode } from "react";

import { RecenterButton } from "@/components/route-screen-chrome";
import { SlideToAction } from "@/components/slide-to-action";
import { VehicleButton, VehicleCard } from "@/features/vehicles/components";
import { useTheme } from "@/providers/theme-provider";

/**
 * O "Modo Operacional": a tela que fica no painel do ônibus enquanto a
 * viagem acontece — mapa em tela cheia, folha deslizante com as
 * paradas, e a linha de cada aluno com os botões de embarque,
 * desembarque e ausência.
 *
 * Saiu de `inicio-screen.tsx` na auditoria 26/09/2026 (item 4). É a
 * parte do app que roda com o ônibus andando, então merece um arquivo
 * onde caiba na tela.
 */

export function ParadaCard({
  parada,
  alunos,
  eventos,
  tripId,
  podeOperar,
  driverPosition,
  ausentesHojeIds,
}: {
  parada: RouteStop;
  alunos: RouteStudent[];
  eventos: TripStudentEvent[];
  tripId: string;
  podeOperar: boolean;
  driverPosition: DistanceCoordenada | null;
  /** Ausente de propósito (default vazio): a listagem "trip encerrada"
   * não precisa da sugestão de continuidade, já não há mais decisão a
   * tomar. */
  ausentesHojeIds?: Set<string>;
}): JSX.Element {
  const { theme } = useTheme();

  return (
    <VehicleCard>
      <View style={inicioStyles.paradaHeader}>
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
            ausenteNaIdaHoje={ausentesHojeIds?.has(aluno.studentId) ?? false}
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
export function ModoOperacionalFullScreen({
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
  onEncerrar,
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
  /** `EMB-01` — encerrar passando pela conferência do checklist, nunca `finishTrip.mutate` direto. */
  onEncerrar: () => void;
  mapKey: number;
  onRecenter: () => void;
}): JSX.Element {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  // "IA de continuidade" ida→volta (pedido do usuário: "se o aluno ficou
  // ausente na rota de ida, na volta aparecerá como ausente ou o
  // transportador pode colocar que ele foi embarcado" — decisão
  // confirmada: sugestão de 1 toque, NUNCA registra nada sozinho).
  // Paridade exata com `minha-rota/page.tsx` no Painel Web.
  const stopsById = new Map(paradasOrdenadas.map((parada) => [parada.id, parada]));
  const alunosVoltaIds = routeStudents
    .filter((aluno) => stopsById.get(aluno.paradaEmbarqueId)?.schoolId)
    .map((aluno) => aluno.studentId);
  const { data: attendanceToday } = useStudentsAttendanceToday(alunosVoltaIds);
  const ausentesHojeIds = new Set(
    (attendanceToday ?? []).filter((a) => a.ausenteHoje).map((a) => a.studentId),
  );

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
              style={{ color: theme.colors.text, fontWeight: "700", fontSize: 14, maxWidth: 110 }}
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
        <View style={inicioStyles.mapCardBodyRow}>
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
                style={[inicioStyles.navegarButton, { backgroundColor: theme.colors.primaryMuted }]}
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
                ausenteNaIdaHoje={ausentesHojeIds.has(aluno.studentId)}
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
                  onComplete={onEncerrar}
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
                ausentesHojeIds={ausentesHojeIds}
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
  ausenteNaIdaHoje = false,
}: {
  aluno: RouteStudent;
  parada: RouteStop;
  eventos: TripStudentEvent[];
  tripId: string;
  podeOperar: boolean;
  driverPosition: DistanceCoordenada | null;
  /**
   * "IA de continuidade" ida→volta — `true` quando este aluno já foi
   * marcado AUSENTE hoje em OUTRA viagem (a ida). Decisão do usuário:
   * "sugestão com 1 toque" — NUNCA marca ausência sozinho, só mostra o
   * aviso com um atalho; o botão de Embarque normal continua ativo do
   * lado, pro transportador decidir se o aluno voltou a aparecer.
   */
  ausenteNaIdaHoje?: boolean;
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
                <ActivityIndicator color={theme.colors.onPrimary} size="small" />
              ) : (
                <>
                  {isEmbarque ? (
                    <LogIn size={16} color={theme.colors.onPrimary} />
                  ) : (
                    <LogOut size={16} color={theme.colors.onPrimary} />
                  )}
                  <Text style={[styles.alunoActionButtonLabel, { color: theme.colors.onPrimary }]}>
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

      {/* "IA de continuidade" ida→volta — só sugere, nunca registra
          sozinho. Some assim que o motorista/monitor tomar QUALQUER
          decisão sobre este aluno (embarque ou confirmar ausência). */}
      {isEmbarque && ausenteNaIdaHoje && !jaOcorreu && !jaAusente ? (
        <View style={[styles.continuidadeAviso, { backgroundColor: `${theme.colors.warning}1a` }]}>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={{ color: theme.colors.warning, fontSize: 11, fontWeight: "700" }}>
              Ausente na ida
            </Text>
            <Text style={{ color: theme.colors.textMuted, fontSize: 12 }}>
              Continua ausente ou embarcou pra voltar?
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            disabled={!podeOperar || addEvent.isPending}
            onPress={() => addEvent.mutate({ studentId: aluno.studentId, tipo: "AUSENTE" })}
            style={{ opacity: podeOperar ? 1 : 0.4 }}
          >
            <Text style={{ color: theme.colors.driverDanger, fontSize: 12, fontWeight: "700" }}>
              Confirmar ausência
            </Text>
          </Pressable>
        </View>
      ) : null}

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
                <Text style={{ color: theme.colors.driverDanger, fontSize: 14, fontWeight: "600" }}>
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
  alunoActionButton: {
    alignItems: "center",
    borderRadius: 999,
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  alunoActionButtonLabel: { fontSize: 14, fontWeight: "600" },
  alunoActions: { alignItems: "center", flexDirection: "row", gap: 16 },
  alunoRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
  },
  alunoRowContainer: { gap: 4, paddingVertical: 6 },
  ausenciaActionsRow: { alignItems: "center", flexDirection: "row", gap: 16, paddingTop: 2 },
  ausenciaConfirmButton: { paddingVertical: 4 },
  ausenciaForm: { borderRadius: 16, gap: 8, padding: 12 },
  ausenciaInput: {
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 14,
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
  continuidadeAviso: {
    alignItems: "center",
    borderRadius: 12,
    flexDirection: "row",
    gap: 8,
    justifyContent: "space-between",
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
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
  rosterCompleto: { borderTopWidth: 1, gap: 10, paddingTop: 12 },
});
