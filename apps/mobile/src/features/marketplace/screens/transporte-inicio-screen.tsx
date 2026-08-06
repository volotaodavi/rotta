import { ApiError, type Contract, type RatingTargetType } from "@rotta/api-client";
import { RottaMap } from "@rotta/maps/native";
import { useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { useAssinarContratoComoResponsavel } from "../hooks/use-contracts";
import { useCreateRating, useRatings } from "../hooks/use-ratings";
import { useResponsavelTransportState } from "../hooks/use-transport-state";
import { useTransporterDetail } from "../hooks/use-transporters";
import {
  CONTRACT_STATUS_LABEL,
  CONTRACT_STATUS_TONE,
  TRANSPORT_REQUEST_STATUS_LABEL,
  TRANSPORT_REQUEST_STATUS_TONE,
} from "../labels";

import type { ParentTabParamList } from "@/navigation/types";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";

import { useGpsForStudent } from "@/features/gps/hooks/use-gps";
import { useSchool } from "@/features/schools/hooks/use-schools";
import {
  StatusPill,
  VehicleButton,
  VehicleCard,
  VehicleScreen,
  VehicleTextField,
} from "@/features/vehicles/components";
import { useTheme } from "@/providers/theme-provider";

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
            <StatusPill
              label={TRANSPORT_REQUEST_STATUS_LABEL[request.status]}
              tone={TRANSPORT_REQUEST_STATUS_TONE[request.status]}
            />
            <Text style={{ color: theme.colors.textMuted }}>
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
        {ultimoContrato ? (
          <ContratoAssinatura contrato={ultimoContrato} />
        ) : solicitacaoAprovadaSemContrato ? (
          <VehicleCard>
            <StatusPill label="Aprovada" tone="success" />
            <Text style={{ color: theme.colors.textMuted }}>
              Sua solicitação foi aprovada. O transportador vai gerar o contrato em breve.
            </Text>
          </VehicleCard>
        ) : null}
      </VehicleScreen>
    );
  }

  if (state === "TRANSPORTE_ATIVO" && contratoAtivo) {
    return (
      <VehicleScreen>
        <Text style={[styles.titulo, { color: theme.colors.text }]}>Meu Transporte</Text>
        <DetalhesContrato contrato={contratoAtivo} />

        <AcompanhamentoSection contrato={contratoAtivo} />

        <AvaliacoesSection contrato={contratoAtivo} />
      </VehicleScreen>
    );
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
function AcompanhamentoSection({ contrato }: { contrato: Contract }): JSX.Element {
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
                    titulo: `${viagem.placa} — ${viagem.motoristaNome}`,
                    latitude: viagem.latitude,
                    longitude: viagem.longitude,
                    // Viagem em andamento agora — sempre um veículo em movimento.
                    emMovimento: true,
                  },
                ]}
                initialCenter={{ latitude: viagem.latitude, longitude: viagem.longitude }}
                initialZoom={14}
              />
            </View>
          ) : null}
          <Text style={{ color: theme.colors.text }}>
            {viagem.routeNome} — motorista {viagem.motoristaNome}
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
          <Text style={{ color: theme.colors.text }}>
            {RATING_TARGETS.find((t) => t.tipo === rating.alvoTipo)?.label ?? rating.alvoTipo}: ★{" "}
            {rating.nota}
          </Text>
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
  avaliacoes: { gap: 12 },
  header: { flexDirection: "row" },
  mapa: { borderRadius: 12, height: 180, overflow: "hidden" },
  mensalidade: { fontWeight: "600" },
  notas: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  rotuloAvaliacao: { fontWeight: "600" },
  secao: { fontSize: 16, fontWeight: "700" },
  titulo: { fontSize: 18, fontWeight: "700" },
});
