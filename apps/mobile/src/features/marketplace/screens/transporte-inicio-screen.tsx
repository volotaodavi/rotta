import {
  ApiError,
  type Contract,
  type MapVehicle,
  type RatingTargetType,
  type StudentEventsHistoryRange,
  type TripStudentEventType,
} from "@rotta/api-client";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Clock,
  MapPin,
  Navigation,
  Star,
  UserX,
} from "@rotta/icons/native";
import { RottaMap } from "@rotta/maps/native";
import { Timeline } from "@rotta/ui/native";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { useAssinarContratoComoResponsavel } from "../hooks/use-contracts";
import { useCreateRating, useRatings } from "../hooks/use-ratings";
import { useResponsavelTransportState } from "../hooks/use-transport-state";
import { useTransporterDetail } from "../hooks/use-transporters";
import { CONTRACT_STATUS_LABEL, CONTRACT_STATUS_TONE } from "../labels";
import { buildContratoSteps, buildSolicitacaoSteps } from "../timeline-steps";

import type { ParentTabParamList } from "@/navigation/types";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";

import { RecenterButton } from "@/components/route-screen-chrome";
import { useGpsForStudent, useStudentEventsHistory } from "@/features/gps/hooks/use-gps";
import { useSchool } from "@/features/schools/hooks/use-schools";
import {
  StatusPill,
  VehicleButton,
  VehicleCard,
  VehicleScreen,
  VehicleTextField,
} from "@/features/vehicles/components";
import { tripsApi } from "@/lib/api-client";
import { useTheme } from "@/providers/theme-provider";

function formatarHora(iso: string): string {
  return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

const EVENT_LABEL: Record<TripStudentEventType, string> = {
  EMBARCOU: "Embarcou",
  AUSENTE: "Marcado como ausente",
  DESEMBARCOU: "Desembarcou",
};

const HISTORY_RANGE_LABEL: Record<StudentEventsHistoryRange, string> = {
  hoje: "Hoje",
  semana: "Semana",
  mes: "Mês",
};

/**
 * "Viagens" — histórico de embarque/desembarque do próprio filho, com
 * abas Hoje/Semana/Mês (modelo de referência enviado pelo usuário —
 * paridade com `HistoricoEventosCard` do Painel Web,
 * `apps/web/src/app/(dashboard)/alunos/[id]/mapa/page.tsx`). Ícone
 * colorido por tipo de evento (verde embarque, azul desembarque,
 * vermelho ausência) em vez de texto plano — mesma paleta semântica da
 * versão web. Aba ativa usa `theme.colors.success` (verde, cor de papel
 * do Responsável nas 3 imagens de referência).
 */
function HistoricoEventosCard({ studentId }: { studentId: string }): JSX.Element {
  const { theme } = useTheme();
  const [range, setRange] = useState<StudentEventsHistoryRange>("hoje");
  const { data: eventos, isLoading } = useStudentEventsHistory(studentId, range);

  const eventIcon: Record<TripStudentEventType, JSX.Element> = {
    EMBARCOU: <ArrowUpCircle size={18} color={theme.colors.success} />,
    DESEMBARCOU: <ArrowDownCircle size={18} color={theme.colors.primary} />,
    AUSENTE: <UserX size={18} color={theme.colors.danger} />,
  };

  return (
    <VehicleCard>
      <View style={styles.viagensHeader}>
        <Text style={[styles.secao, { color: theme.colors.text }]}>Viagens</Text>
        <View style={styles.viagensAbas}>
          {(Object.keys(HISTORY_RANGE_LABEL) as StudentEventsHistoryRange[]).map((key) => (
            <TouchableOpacity
              key={key}
              onPress={() => setRange(key)}
              style={[
                styles.viagensAba,
                {
                  backgroundColor: range === key ? theme.colors.success : theme.colors.muted,
                },
              ]}
            >
              <Text
                style={{
                  color: range === key ? "#fff" : theme.colors.textMuted,
                  fontSize: 12,
                  fontWeight: "600",
                }}
              >
                {HISTORY_RANGE_LABEL[key]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {isLoading ? (
        <ActivityIndicator color={theme.colors.primary} />
      ) : !eventos || eventos.length === 0 ? (
        <Text style={{ color: theme.colors.textMuted, textAlign: "center", paddingVertical: 8 }}>
          Nenhum embarque ou desembarque registrado neste período.
        </Text>
      ) : (
        <View style={{ gap: 10 }}>
          {eventos.map((event) => (
            <View key={event.id} style={styles.eventoRow}>
              {eventIcon[event.tipo]}
              <Text style={{ color: theme.colors.text, flex: 1 }}>{EVENT_LABEL[event.tipo]}</Text>
              <Text style={{ color: theme.colors.textMuted, fontSize: 12 }}>
                {range === "hoje"
                  ? formatarHora(event.processadoEm)
                  : new Date(event.processadoEm).toLocaleString("pt-BR", {
                      day: "2-digit",
                      month: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
              </Text>
            </View>
          ))}
        </View>
      )}
    </VehicleCard>
  );
}

/** Mesmo endpoint de `driver/hooks/use-driver-trip.ts#useTripProximasEtas` (Frente L/M) — já usado pelo Responsável no Painel Web, faltava só o app nativo. */
function useProximasEtasResponsavel(tripId: string | undefined) {
  return useQuery({
    queryKey: ["responsavel", "trips", tripId, "proximas-etas"],
    queryFn: () => tripsApi.getProximasEtas(tripId as string),
    enabled: Boolean(tripId),
    refetchInterval: tripId ? 30_000 : false,
  });
}

type Props = BottomTabScreenProps<ParentTabParamList, "Transporte">;

const RATING_TARGETS: {
  tipo: RatingTargetType;
  label: string;
  presente: (contrato: Contract) => boolean;
}[] = [
  { tipo: "EMPRESA", label: "Transportadora", presente: () => true },
  { tipo: "MOTORISTA", label: "Motorista", presente: (c) => Boolean(c.motoristaId) },
  { tipo: "MONITOR", label: "Monitor", presente: (c) => Boolean(c.monitorId) },
  { tipo: "VEICULO", label: "Veículo", presente: (c) => Boolean(c.vehicleId) },
];

/**
 * Tela da aba "Transporte" (briefing "Marketplace" §"MEU TRANSPORTE"/
 * "ACOMPANHAMENTO"/"AVALIAÇÕES" — o rótulo da própria aba já muda por
 * estado, ver `TRANSPORT_TAB_LABEL`/`ParentNavigator`). Cobre os 5
 * estados do Responsável com dados reais (nunca texto fixo): solicitação
 * pendente, assinatura de contrato, transporte ativo (dados completos do
 * transportador/escola/contrato + avaliações após ativação) e transporte
 * encerrado. O acompanhamento em tempo real (mapa/GPS/motorista/ETA)
 * agora é real (`AcompanhamentoSection`, `GET /gps/students/:id`) —
 * mostra o transporte no mapa quando há uma viagem em andamento, ou
 * uma mensagem honesta quando não há ("nenhum transporte agora"),
 * nunca um mapa falso.
 *
 * "Solicitação em análise"/"Aguardando contrato" agora usam a
 * `Timeline` de `@rotta/ui/native` (Prompt "UX/UI Master do
 * Marketplace" §STATUS — "Tudo em Timeline. Sem telas vazias.") — cada
 * etapa vem do status real (`TransportRequestStatus`/`assinadoResponsavelEm`
 * do `Contract`), nunca uma barra de progresso fake.
 */
export function TransporteInicioScreen({ navigation }: Props): JSX.Element {
  const { theme } = useTheme();
  const {
    isLoading,
    state,
    contratoAtivo,
    ultimoContrato,
    solicitacoesPendentes,
    solicitacaoAprovadaSemContrato,
  } = useResponsavelTransportState();

  if (isLoading) {
    return (
      <VehicleScreen>
        <ActivityIndicator color={theme.colors.primary} />
      </VehicleScreen>
    );
  }

  if (state === "SEM_TRANSPORTE") {
    return (
      <VehicleScreen>
        <Text style={[styles.titulo, { color: theme.colors.text }]}>
          Você ainda não tem transporte escolar
        </Text>
        <Text style={{ color: theme.colors.textMuted }}>
          Busque um transportador próximo de você para solicitar o transporte do seu filho.
        </Text>
        <VehicleButton label="Buscar transportadores" onPress={() => navigation.navigate("Mapa")} />
      </VehicleScreen>
    );
  }

  if (state === "SOLICITACAO_PENDENTE") {
    return (
      <VehicleScreen>
        <Text style={[styles.titulo, { color: theme.colors.text }]}>Solicitação em análise</Text>
        {solicitacoesPendentes.map((request) => (
          <VehicleCard key={request.id}>
            <Timeline steps={buildSolicitacaoSteps(request)} theme={theme} />
            <Text style={{ color: theme.colors.textMuted, marginTop: theme.spacing[2] }}>
              Enviada em {new Date(request.createdAt).toLocaleDateString("pt-BR")}
            </Text>
          </VehicleCard>
        ))}
      </VehicleScreen>
    );
  }

  if (state === "AGUARDANDO_CONTRATO") {
    return (
      <VehicleScreen>
        <Text style={[styles.titulo, { color: theme.colors.text }]}>Aguardando contrato</Text>
        <VehicleCard>
          <Timeline steps={buildContratoSteps(ultimoContrato ?? null)} theme={theme} />
        </VehicleCard>
        {ultimoContrato ? (
          <ContratoAssinatura contrato={ultimoContrato} />
        ) : solicitacaoAprovadaSemContrato ? (
          <Text style={{ color: theme.colors.textMuted }}>
            Sua solicitação foi aprovada. O transportador vai gerar o contrato em breve.
          </Text>
        ) : null}
      </VehicleScreen>
    );
  }

  if (state === "TRANSPORTE_ATIVO" && contratoAtivo) {
    return <TransporteAtivoScreen contrato={contratoAtivo} />;
  }

  // CONTRATO_ENCERRADO
  return (
    <VehicleScreen>
      <Text style={[styles.titulo, { color: theme.colors.text }]}>Transporte encerrado</Text>
      {ultimoContrato ? <DetalhesContrato contrato={ultimoContrato} /> : null}
      {ultimoContrato ? <AvaliacoesSection contrato={ultimoContrato} /> : null}
      <Text style={{ color: theme.colors.textMuted }}>
        Busque um novo transportador quando precisar.
      </Text>
      <VehicleButton label="Buscar transportadores" onPress={() => navigation.navigate("Mapa")} />
    </VehicleScreen>
  );
}

/**
 * Aba "Transporte" com transporte ativo — decide entre o acompanhamento
 * em tela cheia (quando há viagem em curso agora) e o layout compacto de
 * sempre (contrato + acompanhamento + avaliações, sem nada de real pra
 * preencher a tela toda). `AcompanhamentoSection` continua existindo
 * intacta pra Home adaptativa da aba "Mapa" (Estado 2) reusar — só esta
 * tela dedicada ganha o tratamento em tela cheia.
 */
function TransporteAtivoScreen({ contrato }: { contrato: Contract }): JSX.Element {
  const { theme } = useTheme();
  const { data: viagem, isLoading } = useGpsForStudent(contrato.studentId);

  if (isLoading || !viagem) {
    return (
      <VehicleScreen>
        <Text style={[styles.titulo, { color: theme.colors.text }]}>Meu Transporte</Text>
        <DetalhesContrato contrato={contrato} />
        <AcompanhamentoSection contrato={contrato} />
        <HistoricoEventosCard studentId={contrato.studentId} />
        <AvaliacoesSection contrato={contrato} />
      </VehicleScreen>
    );
  }

  return <TransporteEmAndamentoScreen contrato={contrato} viagem={viagem} />;
}

/**
 * Acompanhamento com viagem em curso (3 imagens de referência
 * anexadas pelo usuário, tela do Responsável — "Viagem em andamento":
 * mapa em CARTÃO compacto no topo de uma tela que rola, nunca em tela
 * cheia) — Frente 301, reverte o padrão anterior (Frente P5/Q) que
 * usava mapa em tela cheia com cartões flutuando por cima. Cor de
 * papel verde (`success`, já existente na paleta — Responsável) nos
 * acentos desta tela.
 *
 * Sem chat com o motorista aqui: a Rotta não tem canal de chat ao vivo
 * no app nativo (só Chamados no Painel Web) — nenhum botão fingindo uma
 * função que não existe.
 */
function TransporteEmAndamentoScreen({
  contrato,
  viagem,
}: {
  contrato: Contract;
  viagem: MapVehicle;
}): JSX.Element {
  const { theme } = useTheme();
  const { data: proximasEtas } = useProximasEtasResponsavel(viagem.tripId);
  const proximaParada = proximasEtas?.[0];
  // Botão "centralizar no meu GPS" (Frente Q) — o mapa nativo, igual o
  // web, só lê `initialCenter` na montagem; remontar com uma nova `key`
  // é como recentraliza de verdade.
  const [mapKey, setMapKey] = useState(0);

  return (
    <View style={[styles.opScreen, { backgroundColor: theme.colors.background }]}>
      <ScrollView contentContainerStyle={styles.opScrollContent}>
        <Text style={[styles.titulo, { color: theme.colors.text, margin: 16 }]}>
          Meu Transporte
        </Text>

        <View
          style={[
            styles.mapCard,
            { backgroundColor: theme.colors.card, borderColor: theme.colors.border },
          ]}
        >
          <View style={styles.mapCardMap}>
            {viagem.latitude && viagem.longitude ? (
              <RottaMap
                key={mapKey}
                markers={[
                  {
                    id: viagem.tripId,
                    titulo: `${viagem.placa}: ${viagem.motoristaNome}`,
                    latitude: viagem.latitude,
                    longitude: viagem.longitude,
                    emMovimento: true,
                  },
                ]}
                initialCenter={{ latitude: viagem.latitude, longitude: viagem.longitude }}
                initialZoom={14}
                // "Mapa em modo GPS" (Frente 4) — o Responsável acompanha
                // o veículo do próprio filho se movendo de verdade.
                followMode
              />
            ) : (
              <View style={[styles.mapaVazioFill, { backgroundColor: theme.colors.card }]}>
                <Text style={{ color: theme.colors.textMuted, fontSize: 12 }}>
                  Aguardando a primeira posição do motorista…
                </Text>
              </View>
            )}
            <RecenterButton
              onPress={() => setMapKey((k) => k + 1)}
              style={{ position: "absolute", right: 8, bottom: 8 }}
            />
          </View>

          <View style={styles.mapCardBody}>
            <View style={styles.mapCardBodyRow}>
              <StatusPill label="Em viagem agora" tone="success" />
              {proximaParada ? (
                <View style={styles.etaRow}>
                  <Clock size={14} color={theme.colors.success} />
                  <Text style={{ color: theme.colors.success, fontWeight: "600", fontSize: 13 }}>
                    Chegando às {formatarHora(proximaParada.etaPrevista)}
                  </Text>
                </View>
              ) : null}
            </View>

            <View style={[styles.veiculoRow, { borderColor: theme.colors.border, borderWidth: 1 }]}>
              <View style={[styles.veiculoIcone, { backgroundColor: theme.colors.primaryMuted }]}>
                <Navigation size={20} color={theme.colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: theme.colors.text, fontWeight: "600" }}>
                  {viagem.placa}: {viagem.routeNome}
                </Text>
                <Text style={{ color: theme.colors.textMuted, fontSize: 12 }}>
                  Motorista: {viagem.motoristaNome}
                  {viagem.monitorNome ? ` · Monitor: ${viagem.monitorNome}` : ""}
                </Text>
              </View>
            </View>

            {proximasEtas && proximasEtas.length > 0 ? (
              <View style={{ gap: 6 }}>
                {proximasEtas.slice(0, 2).map((eta) => (
                  <View key={eta.routeStopId} style={styles.paradaRow}>
                    <MapPin size={14} color={theme.colors.textMuted} />
                    <Text
                      style={{ color: theme.colors.text, fontSize: 12, flex: 1 }}
                      numberOfLines={1}
                    >
                      {eta.endereco}
                    </Text>
                    <Text style={{ color: theme.colors.textMuted, fontSize: 12 }}>
                      {formatarHora(eta.etaPrevista)}
                    </Text>
                  </View>
                ))}
              </View>
            ) : null}
          </View>
        </View>

        <View style={styles.abaixoDoMapa}>
          <DetalhesContrato contrato={contrato} />
          <HistoricoEventosCard studentId={contrato.studentId} />
          <AvaliacoesSection contrato={contrato} />
        </View>
      </ScrollView>
    </View>
  );
}

function DetalhesContrato({ contrato }: { contrato: Contract }): JSX.Element {
  const { theme } = useTheme();
  const { data: transportador } = useTransporterDetail(contrato.companyId);
  const { data: escola } = useSchool(contrato.schoolId);

  return (
    <VehicleCard>
      <View style={styles.header}>
        <StatusPill
          label={CONTRACT_STATUS_LABEL[contrato.status]}
          tone={CONTRACT_STATUS_TONE[contrato.status]}
        />
      </View>
      <Text style={{ color: theme.colors.text }}>
        {transportador?.nomeFantasia ?? "Carregando transportador..."}
      </Text>
      <Text style={{ color: theme.colors.textMuted }}>
        {escola?.nomeOficial ?? "Carregando escola..."}
      </Text>
      <Text style={[styles.mensalidade, { color: theme.colors.primary }]}>
        R$ {(contrato.valorMensalidadeCentavos / 100).toFixed(2)}/mês
      </Text>
      <Text style={{ color: theme.colors.textMuted }}>{contrato.planoDescricao}</Text>
      <Text style={{ color: theme.colors.textMuted }}>{contrato.regras}</Text>
      <Text style={{ color: theme.colors.textMuted }}>
        Vigência: {new Date(contrato.vigenciaInicio).toLocaleDateString("pt-BR")}
        {contrato.vigenciaFim
          ? ` até ${new Date(contrato.vigenciaFim).toLocaleDateString("pt-BR")}`
          : ""}
      </Text>
    </VehicleCard>
  );
}

/**
 * "Acompanhamento" (briefing "Marketplace" §"ACOMPANHAMENTO" —
 * mapa/GPS/motorista/ETA em tempo real). `GET /gps/students/:id`
 * (GPS-01/03/06) devolve a viagem ativa do aluno agora, ou `null`
 * quando não há transporte em andamento — o card mostra sempre um
 * estado real (mapa, ou mensagem honesta), nunca um mapa falso.
 */
/** Exportado para a Home adaptativa da aba "Mapa" (Fase 2, Dossiê 38 §3) reusar a mesma seção de acompanhamento ao vivo. */
export function AcompanhamentoSection({ contrato }: { contrato: Contract }): JSX.Element {
  const { theme } = useTheme();
  const { data: viagem, isLoading } = useGpsForStudent(contrato.studentId);

  return (
    <VehicleCard>
      <Text style={[styles.secao, { color: theme.colors.text }]}>Acompanhamento</Text>

      {isLoading ? (
        <ActivityIndicator color={theme.colors.primary} />
      ) : !viagem ? (
        <Text style={{ color: theme.colors.textMuted }}>
          Nenhum transporte em andamento no momento. O mapa aparece aqui assim que a viagem começar.
        </Text>
      ) : (
        <>
          {viagem.latitude && viagem.longitude ? (
            <View style={styles.mapa}>
              <RottaMap
                markers={[
                  {
                    id: viagem.tripId,
                    titulo: `${viagem.placa}: ${viagem.motoristaNome}`,
                    latitude: viagem.latitude,
                    longitude: viagem.longitude,
                    // Viagem em andamento agora — sempre um veículo em movimento.
                    emMovimento: true,
                  },
                ]}
                initialCenter={{ latitude: viagem.latitude, longitude: viagem.longitude }}
                initialZoom={14}
                // "Mapa em modo GPS" (Frente 4) — mesma paridade da tela
                // acima.
                followMode
              />
            </View>
          ) : null}
          <Text style={{ color: theme.colors.text }}>
            {viagem.routeNome}, motorista {viagem.motoristaNome}
            {viagem.monitorNome ? `, monitor ${viagem.monitorNome}` : ""}
          </Text>
          <Text style={{ color: theme.colors.textMuted }}>
            {viagem.ultimaPosicaoEm
              ? `Última posição: ${new Date(viagem.ultimaPosicaoEm).toLocaleTimeString("pt-BR")}`
              : "Aguardando a primeira posição do motorista"}
          </Text>
        </>
      )}
    </VehicleCard>
  );
}

function ContratoAssinatura({ contrato }: { contrato: Contract }): JSX.Element {
  const { theme } = useTheme();
  const assinar = useAssinarContratoComoResponsavel(contrato.id);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleAssinar(): Promise<void> {
    setErrorMessage(null);
    try {
      await assinar.mutateAsync();
    } catch (error) {
      setErrorMessage(error instanceof ApiError ? error.message : "Erro inesperado ao assinar.");
    }
  }

  return (
    <>
      <DetalhesContrato contrato={contrato} />
      {contrato.assinadoResponsavelEm ? (
        <VehicleCard>
          <StatusPill label="Aguardando assinatura do transportador" tone="warning" />
        </VehicleCard>
      ) : (
        <>
          {errorMessage ? <Text style={{ color: theme.colors.danger }}>{errorMessage}</Text> : null}
          <VehicleButton
            label="Assinar contrato"
            onPress={() => void handleAssinar()}
            isLoading={assinar.isPending}
          />
        </>
      )}
    </>
  );
}

function AvaliacoesSection({ contrato }: { contrato: Contract }): JSX.Element {
  const { theme } = useTheme();
  const { data: ratings, isLoading } = useRatings(contrato.id);

  const alvosPendentes = RATING_TARGETS.filter(
    (target) =>
      target.presente(contrato) && !ratings?.some((rating) => rating.alvoTipo === target.tipo),
  );

  return (
    <View style={styles.avaliacoes}>
      <Text style={[styles.secao, { color: theme.colors.text }]}>Avaliações</Text>
      {isLoading ? <ActivityIndicator color={theme.colors.primary} /> : null}
      {(ratings ?? []).map((rating) => (
        <VehicleCard key={rating.id}>
          <View style={styles.avaliacao}>
            <Text style={{ color: theme.colors.text }}>
              {RATING_TARGETS.find((t) => t.tipo === rating.alvoTipo)?.label ?? rating.alvoTipo}:
            </Text>
            <Star size={14} color={theme.colors.text} fill={theme.colors.text} />
            <Text style={{ color: theme.colors.text }}>{rating.nota}</Text>
          </View>
          {rating.comentario ? (
            <Text style={{ color: theme.colors.textMuted }}>{rating.comentario}</Text>
          ) : null}
        </VehicleCard>
      ))}
      {alvosPendentes.map((target) => (
        <RatingForm
          key={target.tipo}
          contratoId={contrato.id}
          alvoTipo={target.tipo}
          label={target.label}
        />
      ))}
    </View>
  );
}

function RatingForm({
  contratoId,
  alvoTipo,
  label,
}: {
  contratoId: string;
  alvoTipo: RatingTargetType;
  label: string;
}): JSX.Element {
  const { theme } = useTheme();
  const createRating = useCreateRating(contratoId);
  const [nota, setNota] = useState<number | null>(null);
  const [comentario, setComentario] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleEnviar(): Promise<void> {
    if (nota === null) return;
    setErrorMessage(null);
    try {
      await createRating.mutateAsync({ alvoTipo, nota, comentario: comentario || undefined });
    } catch (error) {
      setErrorMessage(error instanceof ApiError ? error.message : "Erro inesperado ao avaliar.");
    }
  }

  return (
    <VehicleCard>
      <Text style={[styles.rotuloAvaliacao, { color: theme.colors.text }]}>Avaliar {label}</Text>
      <View style={styles.notas}>
        {[1, 2, 3, 4, 5].map((valor) => (
          <VehicleButton
            key={valor}
            label={String(valor)}
            variant={nota === valor ? "primary" : "secondary"}
            onPress={() => setNota(valor)}
          />
        ))}
      </View>
      <VehicleTextField
        label="Comentário (opcional)"
        value={comentario}
        onChangeText={setComentario}
        multiline
      />
      {errorMessage ? <Text style={{ color: theme.colors.danger }}>{errorMessage}</Text> : null}
      <VehicleButton
        label="Enviar avaliação"
        onPress={() => void handleEnviar()}
        disabled={nota === null}
        isLoading={createRating.isPending}
      />
    </VehicleCard>
  );
}

const styles = StyleSheet.create({
  abaixoDoMapa: { gap: 16, padding: 24 },
  avaliacao: { alignItems: "center", flexDirection: "row", gap: 4 },
  avaliacoes: { gap: 12 },
  etaRow: { alignItems: "center", flexDirection: "row", gap: 4 },
  eventoRow: { alignItems: "center", flexDirection: "row", gap: 10 },
  header: { flexDirection: "row" },
  mapCard: { borderRadius: 16, borderWidth: 1, marginHorizontal: 16, overflow: "hidden" },
  mapCardBody: { gap: 12, padding: 12 },
  mapCardBodyRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    justifyContent: "space-between",
  },
  mapCardMap: { height: 208, position: "relative", width: "100%" },
  mapa: { borderRadius: 12, height: 180, overflow: "hidden" },
  mapaVazioFill: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  mensalidade: { fontWeight: "600" },
  notas: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  opScreen: { flex: 1 },
  opScrollContent: { flexGrow: 1, paddingBottom: 24 },
  paradaRow: { alignItems: "center", flexDirection: "row", gap: 8 },
  rotuloAvaliacao: { fontWeight: "600" },
  secao: { fontSize: 16, fontWeight: "700" },
  titulo: { fontSize: 18, fontWeight: "700" },
  veiculoIcone: {
    alignItems: "center",
    borderRadius: 999,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  veiculoRow: {
    alignItems: "center",
    borderRadius: 12,
    flexDirection: "row",
    gap: 12,
    padding: 12,
  },
  viagensAba: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  viagensAbas: { flexDirection: "row", gap: 4 },
  viagensHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
});
