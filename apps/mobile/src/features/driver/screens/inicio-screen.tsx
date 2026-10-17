import { useAuth } from "@rotta/auth/native";
import { AlertTriangle, Bus, Clock, Pause, Play, School } from "@rotta/icons/native";
import { RottaMap } from "@rotta/maps/native";
import { driverShadow } from "@rotta/theme";
import { SlideToAction } from "@rotta/ui/native";
import { useEffect, useState } from "react";
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, View } from "react-native";

import {
  AlunoPreViagemRow,
  AlunosDaViagemCard,
  BackgroundLocationDisclosureModal,
  inicioStyles,
  MeuMapa,
  ModoOperacionalFullScreen,
  PanelGreeting,
  ParadaCard,
  ProximaParadaEtaCard,
  RegistrarOcorrenciaButton,
  TripElapsedTimer,
  TripStatsGrid,
} from "../components";
import { useMinhasRotas } from "../hooks/use-driver-routes";
import { useMyLocation } from "../hooks/use-my-location";
import { useRotaOperacional } from "../hooks/use-rota-operacional";

import type { Route } from "@rotta/api-client";

import { RecenterButton } from "@/components/route-screen-chrome";
import { Texto } from "@/components/texto";
import {
  SentidoSwitch,
  TRIP_SENTIDO_DESCRICAO,
  TRIP_SENTIDO_LABEL,
} from "@/features/routes/components/sentido-switch";
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
      <VehicleScreen backgroundColor={theme.colors.driverBackground}>
        <ActivityIndicator color={theme.colors.driverPrimary} />
      </VehicleScreen>
    );
  }

  if (rotas.length === 0) {
    return (
      <VehicleScreen backgroundColor={theme.colors.driverBackground}>
        <PanelGreeting nome={user?.nome ?? ""} />
        <Texto style={[styles.titulo, { color: theme.colors.text }]}>Nenhuma rota atribuída</Texto>
        <Texto style={{ color: theme.colors.textMuted }}>
          Você ainda não está vinculado a nenhuma rota. Fale com sua transportadora.
        </Texto>
        <MeuMapa location={minhaLocalizacao.location} status={minhaLocalizacao.status} />
      </VehicleScreen>
    );
  }

  if (!rotaAtiva) {
    return (
      <VehicleScreen backgroundColor={theme.colors.driverBackground}>
        <PanelGreeting nome={user?.nome ?? ""} />
        <Texto style={[styles.titulo, { color: theme.colors.text }]}>Suas rotas</Texto>
        {rotas.map((rota) => (
          <Pressable
            accessibilityRole="button"
            key={rota.id}
            onPress={() => setSelectedRouteId(rota.id)}
          >
            <VehicleCard
              style={[
                inicioStyles.driverCard,
                { backgroundColor: theme.colors.surfaceElevated },
                driverShadow[theme.name].native,
              ]}
            >
              <Texto style={{ color: theme.colors.text }}>{rota.nome}</Texto>
              <Texto style={{ color: theme.colors.textMuted }}>{TURNO_LABEL[rota.turno]}</Texto>
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

  /*
   * Toda a regra desta tela vive em `useRotaOperacional` (auditoria
   * 26/09/2026, item 4). Aqui em baixo ficou só a árvore de JSX que
   * consome o resultado — que é o que se lê quando o assunto é
   * layout, e não o que se lê quando o assunto é "quando a viagem
   * pode ser encerrada".
   */
  const {
    accentColor,
    alunosEmbarcados,
    confirmarDivulgacao,
    driverPosition,
    encerrarViagem,
    escolaResumo,
    finishTrip,
    gpsAvisoTexto,
    gpsStatus,
    isActive,
    isDono,
    isLoadingTrip,
    isMotorista,
    janelaHorario,
    mapMarkers,
    markers,
    meuVeiculo,
    minhaLocalizacao,
    paradasOrdenadas,
    paradasRestantesCount,
    pauseTrip,
    progressoEmbarquePct,
    proximaParada,
    proximaParadaStop,
    proximasEtas,
    resumeTrip,
    routeStudents,
    routeStudentsDetalhado,
    semVeiculoPadrao,
    sentidoDaProximaViagem,
    setSentidoEscolhido,
    startTrip,
    studentEvents,
    totalAlunos,
    trip,
    viagemEncerrada,
  } = useRotaOperacional(rota);

  // Botão "centralizar no meu GPS" (Frente Q, imagem de referência) —
  // `RottaMap` só lê `initialCenter`/faz fit de bounds na montagem,
  // então recentralizar de verdade remonta o mapa com uma nova `key`.
  const [mapKey, setMapKey] = useState(0);

  const [avisoSemVeiculoAberto, setAvisoSemVeiculoAberto] = useState(false);
  useEffect(() => {
    if (semVeiculoPadrao) setAvisoSemVeiculoAberto(true);
  }, [semVeiculoPadrao]);

  if (trip && !viagemEncerrada) {
    return (
      <>
        <BackgroundLocationDisclosureModal
          visible={gpsStatus === "aguardando-consentimento"}
          onConfirmar={confirmarDivulgacao}
        />
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
          onEncerrar={() => encerrarViagem(trip.id)}
          mapKey={mapKey}
          onRecenter={() => setMapKey((k) => k + 1)}
        />
      </>
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
            <Texto style={{ color: theme.colors.text, fontWeight: "700", fontSize: 16 }}>
              Nenhum veículo cadastrado
            </Texto>
            <Texto style={{ color: theme.colors.textMuted, textAlign: "center" }}>
              {isDono
                ? "Esta rota ainda não tem um veículo vinculado. Cadastre um veículo pelo Painel Web antes de iniciar a viagem."
                : "Esta rota ainda não tem um veículo vinculado. Fale com sua transportadora para vincular um antes de iniciar a viagem."}
            </Texto>
            <VehicleButton
              label="Entendi"
              variant="primary"
              onPress={() => setAvisoSemVeiculoAberto(false)}
            />
          </View>
        </View>
      </Modal>

      <ScrollView contentContainerStyle={styles.opScrollContent}>
        <PanelGreeting nome={user?.nome ?? ""} subtitulo="Pronto para sua próxima viagem?" />

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
            <View style={inicioStyles.mapCardBodyRow}>
              <Texto style={{ color: theme.colors.text, fontWeight: "700", fontSize: 16 }}>
                {rota.nome}
              </Texto>
              {trip ? (
                <StatusPill
                  label={TRIP_STATUS_LABEL[trip.status]?.label ?? trip.status}
                  tone={TRIP_STATUS_LABEL[trip.status]?.tone ?? "neutral"}
                />
              ) : (
                <Texto style={{ color: theme.colors.textMuted, fontSize: 12 }}>
                  {TURNO_LABEL[rota.turno] ?? rota.turno}
                </Texto>
              )}
            </View>
            {/* Código único da viagem (pedido do usuário: "o código da viagem - único") — só existe depois que a viagem já foi iniciada. */}
            {trip ? (
              <>
                <Texto
                  style={{ color: theme.colors.textMuted, fontSize: 12, fontFamily: "monospace" }}
                >
                  Código da viagem: {trip.codigo}
                </Texto>
                {/* A "placa" da viagem em andamento — quem está
                    dirigindo precisa ver em que sentido está, não só
                    escolher no início. */}
                <Texto style={{ color: theme.colors.textMuted, fontSize: 12 }}>
                  Sentido: {TRIP_SENTIDO_LABEL[trip.sentido]} ·{" "}
                  {TRIP_SENTIDO_DESCRICAO[trip.sentido]}
                </Texto>
              </>
            ) : null}
            <Texto style={{ color: theme.colors.textMuted, fontSize: 12 }}>
              {proximaParada
                ? `Próxima parada: ${proximaParada.endereco}`
                : `${paradasOrdenadas.length} paradas nesta rota`}
            </Texto>
            {showTrocarRota ? (
              <Pressable onPress={onTrocarRota} accessibilityRole="button">
                <Texto style={{ color: accentColor, fontSize: 14, fontWeight: "600" }}>
                  Trocar rota
                </Texto>
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
              inicioStyles.driverCard,
              { backgroundColor: theme.colors.surfaceElevated },
              driverShadow[theme.name].native,
            ]}
          >
            <Texto style={{ color: theme.colors.text, fontWeight: "700" }}>Próxima viagem</Texto>
            {escolaResumo ? (
              <View style={styles.proximaViagemLinha}>
                <School size={14} color={theme.colors.textMuted} />
                <Texto style={{ color: theme.colors.textMuted, fontSize: 12 }} numberOfLines={1}>
                  {escolaResumo}
                </Texto>
              </View>
            ) : null}
            {janelaHorario ? (
              <View style={styles.proximaViagemLinha}>
                <Clock size={14} color={theme.colors.textMuted} />
                <Texto style={{ color: theme.colors.textMuted, fontSize: 12 }}>
                  {janelaHorario}
                </Texto>
              </View>
            ) : null}

            {/*
              Alunos, paradas e veículo como três blocos, e não como
              três linhas de texto cinza do mesmo tamanho: é o desenho
              das telas 16 e 17 do conceito, e é o que o motorista
              confere de relance antes de encostar o dedo no deslizar.
            */}
            <View style={[styles.blocosDaViagem, { borderTopColor: theme.colors.hairline }]}>
              <View style={styles.blocoDaViagem}>
                <Texto style={[styles.blocoNumero, { color: theme.colors.text }]}>
                  {totalAlunos}
                </Texto>
                <Texto style={[styles.blocoRotulo, { color: theme.colors.textMuted }]}>
                  {totalAlunos === 1 ? "Aluno" : "Alunos"}
                </Texto>
              </View>
              <View style={styles.blocoDaViagem}>
                <Texto style={[styles.blocoNumero, { color: theme.colors.text }]}>
                  {paradasOrdenadas.length}
                </Texto>
                <Texto style={[styles.blocoRotulo, { color: theme.colors.textMuted }]}>
                  {paradasOrdenadas.length === 1 ? "Parada" : "Paradas"}
                </Texto>
              </View>
              <View style={styles.blocoDaViagem}>
                <Texto style={[styles.blocoPlaca, { color: theme.colors.text }]} numberOfLines={1}>
                  {meuVeiculo?.placa ?? "-"}
                </Texto>
                <Texto style={[styles.blocoRotulo, { color: theme.colors.textMuted }]}>
                  Veículo
                </Texto>
              </View>
            </View>

            {rota.monitorPadraoId ? (
              <Texto style={{ color: theme.colors.textMuted, fontSize: 12 }}>
                1 monitor nesta viagem
              </Texto>
            ) : null}
            {/*
              Lista detalhada por aluno (pedido do usuário: "aparecerá
              as informações — nome dos alunos, escolas, horário,
              bairros, responsáveis. Embaixo dessas informações, deverá
              ter o botão deslizante para iniciar a viagem/rota") — o
              botão deslizante em si já vive mais abaixo nesta mesma
              tela, fora deste cartão.
            */}
            {routeStudentsDetalhado && routeStudentsDetalhado.length > 0 ? (
              <View style={[styles.alunosPreViagemList, { borderTopColor: theme.colors.hairline }]}>
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
              inicioStyles.driverCard,
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
                <Texto style={[styles.painelTexto, { color: theme.colors.textMuted }]}>
                  Esta rota ainda não tem um veículo cadastrado.{" "}
                  {isDono
                    ? "Cadastre um veículo antes de iniciar a viagem."
                    : "Fale com sua transportadora para vincular um veículo a esta rota."}
                </Texto>
              ) : (
                <View style={styles.inicioViagem}>
                  <SentidoSwitch
                    value={sentidoDaProximaViagem}
                    onChange={setSentidoEscolhido}
                    disabled={startTrip.isPending}
                  />
                  <SlideToAction
                    label={`Deslize para iniciar a ${TRIP_SENTIDO_LABEL[sentidoDaProximaViagem].toLowerCase()}`}
                    theme={theme}
                    onComplete={() =>
                      startTrip.mutate({ routeId: rota.id, sentido: sentidoDaProximaViagem })
                    }
                    isLoading={startTrip.isPending}
                  />
                </View>
              )
            ) : (
              <Texto style={[styles.painelTexto, { color: theme.colors.textMuted }]}>
                Nenhuma viagem registrada hoje. Aguardando o motorista iniciar.
              </Texto>
            )
          ) : viagemEncerrada ? (
            isMotorista ? (
              // Pedido do usuário: "rotas não são feitas para ser
              // finalizadas concretamente... são finalizadas
              // temporariamente até o transportador acionar de novo" —
              // a rota continua disponível pra outra viagem no mesmo
              // dia (ida de manhã, volta à tarde, por exemplo).
              <View style={styles.inicioViagem}>
                <Texto style={[styles.painelTexto, { color: theme.colors.textMuted }]}>
                  A {TRIP_SENTIDO_LABEL[trip.sentido].toLowerCase()} de hoje já foi{" "}
                  {trip.status === "FINALIZADA" ? "finalizada" : "cancelada"}. A rota continua
                  disponível. Pode iniciar outra viagem quando precisar.
                </Texto>
                <SentidoSwitch
                  value={sentidoDaProximaViagem}
                  onChange={setSentidoEscolhido}
                  disabled={startTrip.isPending}
                />
                <SlideToAction
                  label={`Deslize para iniciar a ${TRIP_SENTIDO_LABEL[sentidoDaProximaViagem].toLowerCase()}`}
                  theme={theme}
                  onComplete={() =>
                    startTrip.mutate({ routeId: rota.id, sentido: sentidoDaProximaViagem })
                  }
                  isLoading={startTrip.isPending}
                />
              </View>
            ) : (
              <Texto style={[styles.painelTexto, { color: theme.colors.textMuted }]}>
                A viagem de hoje já foi {trip.status === "FINALIZADA" ? "finalizada" : "cancelada"}.
              </Texto>
            )
          ) : isMotorista ? (
            <>
              {gpsAvisoTexto ? (
                <Texto style={{ color: theme.colors.textMuted, fontSize: 12 }}>
                  {gpsAvisoTexto}
                </Texto>
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
                      onComplete={() => encerrarViagem(trip.id)}
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
                      onComplete={() => encerrarViagem(trip.id)}
                      isLoading={finishTrip.isPending}
                      danger
                    />
                  </View>
                </View>
              )}
            </>
          ) : (
            <Texto style={[styles.painelTexto, { color: theme.colors.textMuted }]}>
              Viagem em andamento. Só o motorista inicia, pausa ou finaliza.
            </Texto>
          )}
        </View>

        {trip && !viagemEncerrada ? (
          <View style={styles.paradasSection}>
            <AlunosDaViagemCard
              alunos={routeStudentsDetalhado ?? []}
              eventos={studentEvents ?? []}
              accentColor={accentColor}
            />
            <RegistrarOcorrenciaButton veiculoId={trip.veiculoId} accentColor={accentColor} />

            <View style={inicioStyles.mapCardBodyRow}>
              <Texto style={[styles.secao, { color: theme.colors.text }]}>Paradas</Texto>
              <Texto style={{ color: theme.colors.textMuted, fontSize: 12 }}>
                {alunosEmbarcados}/{totalAlunos} embarcados
              </Texto>
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

const styles = StyleSheet.create({
  alunosPreViagemList: { borderTopWidth: 1, gap: 8, paddingTop: 12 },
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
  blocoDaViagem: { alignItems: "center", flex: 1, gap: 2 },
  blocoNumero: { fontSize: 20, fontVariant: ["tabular-nums"], fontWeight: "700" },
  blocoPlaca: { fontSize: 15, fontWeight: "700", letterSpacing: 0.5 },
  blocoRotulo: { fontSize: 11 },
  blocosDaViagem: {
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: 8,
    paddingTop: 12,
  },
  controlsRow: { flexDirection: "row", gap: 8 },
  controlsSection: { gap: 8, paddingHorizontal: 16 },
  inicioViagem: { gap: 12 },
  mapCard: { borderRadius: 16, borderWidth: 1, margin: 16, overflow: "hidden" },
  mapCardBody: { gap: 4, padding: 12 },
  mapCardMap: { height: 208, position: "relative", width: "100%" },
  opScreen: { flex: 1 },
  opScrollContent: { flexGrow: 1, paddingBottom: 24 },
  painelTexto: { paddingVertical: 8, textAlign: "center" },
  paradasSection: { gap: 16, paddingHorizontal: 16 },
  progressoBarra: { borderRadius: 999, height: "100%" },
  progressoTrilha: { borderRadius: 999, height: 6, overflow: "hidden", width: "100%" },
  proximaViagemCard: { marginHorizontal: 16 },
  proximaViagemLinha: { alignItems: "center", flexDirection: "row", gap: 6 },
  secao: { fontSize: 16, fontWeight: "700" },
  statsCard: { marginHorizontal: 16 },
  titulo: { fontSize: 20, fontWeight: "700" },
});
