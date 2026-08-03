import { ActivityIndicator, StyleSheet, Text } from "react-native";


import { useResponsavelTransportState } from "../hooks/use-transport-state";
import {
  CONTRACT_STATUS_LABEL,
  CONTRACT_STATUS_TONE,
  TRANSPORT_REQUEST_STATUS_LABEL,
  TRANSPORT_REQUEST_STATUS_TONE,
} from "../labels";

import type { ParentTabParamList } from "@/navigation/types";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";

import {
  StatusPill,
  VehicleButton,
  VehicleCard,
  VehicleScreen,
} from "@/features/vehicles/components";
import { useTheme } from "@/providers/theme-provider";

type Props = BottomTabScreenProps<ParentTabParamList, "Transporte">;

/**
 * Tela padrão da aba "Transporte" (briefing "Marketplace" — o rótulo da
 * própria aba já muda por estado, ver `TRANSPORT_TAB_LABEL`/
 * `ParentNavigator`). Cobre os 5 estados em um nível básico; o detalhe
 * completo de "Meu Transporte" (empresa/motorista/monitor/veículo/
 * escola/horários/mensalidade/contrato + acompanhamento + avaliação)
 * é construído na tarefa seguinte — aqui cada estado já mostra dados
 * reais (nunca texto fixo), só sem a tela de detalhe dedicada ainda.
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
        <Text style={{ color: theme.colors.textMuted }}>
          {ultimoContrato
            ? "O transportador gerou o contrato — assine para ativar o transporte."
            : "Sua solicitação foi aprovada. O transportador vai gerar o contrato em breve."}
        </Text>
        {ultimoContrato ? (
          <VehicleCard>
            <StatusPill
              label={CONTRACT_STATUS_LABEL[ultimoContrato.status]}
              tone={CONTRACT_STATUS_TONE[ultimoContrato.status]}
            />
            <Text style={{ color: theme.colors.text }}>
              R$ {(ultimoContrato.valorMensalidadeCentavos / 100).toFixed(2)}/mês
            </Text>
          </VehicleCard>
        ) : solicitacaoAprovadaSemContrato ? (
          <VehicleCard>
            <StatusPill label="Aprovada" tone="success" />
          </VehicleCard>
        ) : null}
      </VehicleScreen>
    );
  }

  if (state === "TRANSPORTE_ATIVO" && contratoAtivo) {
    return (
      <VehicleScreen>
        <Text style={[styles.titulo, { color: theme.colors.text }]}>Meu Transporte</Text>
        <VehicleCard>
          <StatusPill label="Ativo" tone="success" />
          <Text style={{ color: theme.colors.text }}>
            R$ {(contratoAtivo.valorMensalidadeCentavos / 100).toFixed(2)}/mês
          </Text>
          <Text style={{ color: theme.colors.textMuted }}>{contratoAtivo.planoDescricao}</Text>
        </VehicleCard>
      </VehicleScreen>
    );
  }

  // CONTRATO_ENCERRADO
  return (
    <VehicleScreen>
      <Text style={[styles.titulo, { color: theme.colors.text }]}>Transporte encerrado</Text>
      <Text style={{ color: theme.colors.textMuted }}>
        Seu último contrato de transporte foi encerrado. Busque um novo transportador quando
        precisar.
      </Text>
      <VehicleButton label="Buscar transportadores" onPress={() => navigation.navigate("Mapa")} />
    </VehicleScreen>
  );
}

const styles = StyleSheet.create({
  titulo: { fontSize: 18, fontWeight: "700" },
});
