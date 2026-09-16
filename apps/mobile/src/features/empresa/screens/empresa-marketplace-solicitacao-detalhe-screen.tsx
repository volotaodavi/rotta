import { ApiError } from "@rotta/api-client";
import { useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import {
  useAprovarTransportRequest,
  useContractsList,
  useGerarContrato,
  useMarcarTransportRequestEmAnalise,
  useRecusarTransportRequest,
  useTransportRequest,
} from "../hooks/use-empresa-marketplace";
import { useMyTeam } from "../hooks/use-empresa-team";
import { useVehiclesList } from "../hooks/use-empresa-vehicles";

import type { EmpresaHomeStackParamList } from "@/navigation/types";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import {
  TRANSPORT_REQUEST_STATUS_LABEL,
  TRANSPORT_REQUEST_STATUS_TONE,
} from "@/features/marketplace/labels";
import {
  StatusPill,
  VehicleButton,
  VehicleCard,
  VehicleScreen,
  VehicleTextField,
} from "@/features/vehicles/components";
import { useTheme } from "@/providers/theme-provider";

type Props = NativeStackScreenProps<EmpresaHomeStackParamList, "MarketplaceSolicitacaoDetalhe">;

/**
 * Detalhe de uma solicitação de transporte (Frente A) — ações de
 * transição de status (em análise/aprovar/recusar) e, quando Aprovada
 * e ainda sem contrato, o formulário de geração de contrato. Mirror de
 * `apps/web/.../marketplace/solicitacoes/[id]/page.tsx`, trocando os 3
 * campos de ID cru (veículo/motorista/monitor) por chips de seleção —
 * a frota e a equipe já estão carregadas nesta mesma tela (`useVehiclesList`/
 * `useMyTeam`, mesmos hooks da Frota/Equipe), sem motivo pra pedir um
 * UUID digitado quando dá pra escolher pelo nome.
 */
export function EmpresaMarketplaceSolicitacaoDetalheScreen({
  route,
  navigation,
}: Props): JSX.Element {
  const { theme } = useTheme();
  const { transportRequestId } = route.params;
  const { data: request, isLoading, isError, refetch } = useTransportRequest(transportRequestId);
  const { data: contracts } = useContractsList({ pageSize: 100 });
  const { data: vehiclesResult } = useVehiclesList();
  const { data: team } = useMyTeam();
  const marcarEmAnalise = useMarcarTransportRequestEmAnalise(transportRequestId);
  const aprovar = useAprovarTransportRequest(transportRequestId);
  const recusar = useRecusarTransportRequest(transportRequestId);
  const gerarContrato = useGerarContrato(transportRequestId);

  const [motivoRecusa, setMotivoRecusa] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [valorMensalidade, setValorMensalidade] = useState("");
  const [planoDescricao, setPlanoDescricao] = useState("");
  const [regras, setRegras] = useState("");
  const [vigenciaInicio, setVigenciaInicio] = useState("");
  const [vigenciaFim, setVigenciaFim] = useState("");
  const [vehicleId, setVehicleId] = useState<string | null>(null);
  const [motoristaId, setMotoristaId] = useState<string | null>(null);
  const [monitorId, setMonitorId] = useState<string | null>(null);

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator color={theme.colors.primary} />
      </View>
    );
  }

  if (isError || !request) {
    return (
      <VehicleScreen>
        <Text style={{ color: theme.colors.danger }}>
          Não foi possível carregar esta solicitação.
        </Text>
        <VehicleButton label="Tentar novamente" onPress={() => void refetch()} />
      </VehicleScreen>
    );
  }

  const contratoExistente =
    contracts?.items.find((c) => c.transportRequestId === transportRequestId) ?? null;
  const motoristas = (team ?? []).filter((m) => m.papel === "motorista");
  const monitores = (team ?? []).filter((m) => m.papel === "monitor");

  async function runAction(action: () => Promise<unknown>): Promise<void> {
    setErrorMessage(null);
    try {
      await action();
    } catch (error) {
      setErrorMessage(error instanceof ApiError ? error.message : "Erro inesperado.");
    }
  }

  async function handleGerarContrato(): Promise<void> {
    await runAction(() =>
      gerarContrato.mutateAsync({
        valorMensalidadeCentavos: Math.round(Number(valorMensalidade.replace(",", ".")) * 100),
        planoDescricao,
        regras,
        vigenciaInicio,
        vigenciaFim: vigenciaFim || undefined,
        vehicleId: vehicleId ?? undefined,
        motoristaId: motoristaId ?? undefined,
        monitorId: monitorId ?? undefined,
      }),
    );
  }

  const podeGerarContrato =
    valorMensalidade.trim().length > 0 &&
    planoDescricao.trim().length > 0 &&
    regras.trim().length > 0 &&
    vigenciaInicio.trim().length > 0;

  return (
    <VehicleScreen>
      <VehicleCard style={styles.card}>
        <View style={styles.linha}>
          <Text style={[styles.nome, { color: theme.colors.text }]}>
            {request.studentNome ?? "Aluno"}
          </Text>
          <StatusPill
            label={TRANSPORT_REQUEST_STATUS_LABEL[request.status]}
            tone={TRANSPORT_REQUEST_STATUS_TONE[request.status]}
          />
        </View>
        <Text style={{ color: theme.colors.textMuted, fontSize: 14 }}>
          Responsável: {request.responsavelNome ?? "Não informado"}
          {request.responsavelTelefone ? ` · ${request.responsavelTelefone}` : ""}
        </Text>
        <Text style={{ color: theme.colors.textMuted, fontSize: 14 }}>
          Escola: {request.schoolNome ?? "Não informada"}
        </Text>
        <Text style={{ color: theme.colors.textMuted, fontSize: 14 }}>Turno: {request.turno}</Text>
        <Text style={{ color: theme.colors.textMuted, fontSize: 12 }}>
          Recebida em {new Date(request.createdAt).toLocaleDateString("pt-BR")}
        </Text>
        {request.status === "RECUSADA" && request.motivoRecusa ? (
          <Text style={{ color: theme.colors.danger, fontSize: 14 }}>
            Motivo da recusa: {request.motivoRecusa}
          </Text>
        ) : null}
      </VehicleCard>

      {errorMessage ? <Text style={{ color: theme.colors.danger }}>{errorMessage}</Text> : null}

      {request.status === "RECEBIDA" ? (
        <VehicleButton
          label="Marcar em análise"
          isLoading={marcarEmAnalise.isPending}
          onPress={() => void runAction(() => marcarEmAnalise.mutateAsync())}
        />
      ) : null}

      {request.status === "RECEBIDA" || request.status === "EM_ANALISE" ? (
        <VehicleCard style={styles.card}>
          <Text style={{ color: theme.colors.textMuted, fontWeight: "600", fontSize: 14 }}>
            Decisão
          </Text>
          <VehicleButton
            label="Aprovar solicitação"
            isLoading={aprovar.isPending}
            onPress={() => void runAction(() => aprovar.mutateAsync())}
          />
          <VehicleTextField
            label="Motivo da recusa (necessário só se for recusar)"
            value={motivoRecusa}
            onChangeText={setMotivoRecusa}
            multiline
          />
          <VehicleButton
            label="Recusar solicitação"
            variant="danger"
            disabled={motivoRecusa.trim().length === 0}
            isLoading={recusar.isPending}
            onPress={() => void runAction(() => recusar.mutateAsync(motivoRecusa))}
          />
        </VehicleCard>
      ) : null}

      {request.status === "APROVADA" && !contratoExistente ? (
        <VehicleCard style={styles.card}>
          <Text style={{ color: theme.colors.textMuted, fontWeight: "600", fontSize: 14 }}>
            Gerar contrato
          </Text>
          <VehicleTextField
            label="Mensalidade (R$)"
            value={valorMensalidade}
            onChangeText={setValorMensalidade}
            keyboardType="decimal-pad"
            placeholder="0,00"
          />
          <VehicleTextField
            label="Descrição do plano"
            value={planoDescricao}
            onChangeText={setPlanoDescricao}
          />
          <VehicleTextField
            label="Regras do contrato"
            value={regras}
            onChangeText={setRegras}
            multiline
          />
          <VehicleTextField
            label="Vigência — início (AAAA-MM-DD)"
            value={vigenciaInicio}
            onChangeText={setVigenciaInicio}
            placeholder="ex: 2026-03-01"
          />
          <VehicleTextField
            label="Vigência — fim (opcional)"
            value={vigenciaFim}
            onChangeText={setVigenciaFim}
            placeholder="Deixe em branco para indeterminado"
          />

          <Text style={{ color: theme.colors.textMuted, fontSize: 12 }}>Veículo (opcional)</Text>
          <View style={styles.chips}>
            <VehicleButton
              label="Nenhum"
              variant={vehicleId === null ? "primary" : "secondary"}
              onPress={() => setVehicleId(null)}
            />
            {(vehiclesResult?.items ?? []).map((vehicle) => (
              <VehicleButton
                key={vehicle.id}
                label={vehicle.placa}
                variant={vehicleId === vehicle.id ? "primary" : "secondary"}
                onPress={() => setVehicleId(vehicle.id)}
              />
            ))}
          </View>

          <Text style={{ color: theme.colors.textMuted, fontSize: 12 }}>Motorista (opcional)</Text>
          <View style={styles.chips}>
            <VehicleButton
              label="Nenhum"
              variant={motoristaId === null ? "primary" : "secondary"}
              onPress={() => setMotoristaId(null)}
            />
            {motoristas.map((membro) => (
              <VehicleButton
                key={membro.userId}
                label={membro.nome}
                variant={motoristaId === membro.userId ? "primary" : "secondary"}
                onPress={() => setMotoristaId(membro.userId)}
              />
            ))}
          </View>

          <Text style={{ color: theme.colors.textMuted, fontSize: 12 }}>Monitor (opcional)</Text>
          <View style={styles.chips}>
            <VehicleButton
              label="Nenhum"
              variant={monitorId === null ? "primary" : "secondary"}
              onPress={() => setMonitorId(null)}
            />
            {monitores.map((membro) => (
              <VehicleButton
                key={membro.userId}
                label={membro.nome}
                variant={monitorId === membro.userId ? "primary" : "secondary"}
                onPress={() => setMonitorId(membro.userId)}
              />
            ))}
          </View>

          <VehicleButton
            label="Gerar contrato"
            disabled={!podeGerarContrato}
            isLoading={gerarContrato.isPending}
            onPress={() => void handleGerarContrato()}
          />
        </VehicleCard>
      ) : null}

      {contratoExistente ? (
        <VehicleCard style={styles.linha}>
          <Text style={{ color: theme.colors.textMuted, fontSize: 14 }}>
            Contrato já gerado para esta solicitação.
          </Text>
          <VehicleButton
            label="Ver contrato"
            variant="secondary"
            onPress={() =>
              navigation.navigate("MarketplaceContratoDetalhe", {
                contractId: contratoExistente.id,
              })
            }
          />
        </VehicleCard>
      ) : null}
    </VehicleScreen>
  );
}

const styles = StyleSheet.create({
  card: { gap: 8 },
  center: { alignItems: "center", flex: 1, justifyContent: "center" },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  linha: { alignItems: "center", flexDirection: "row", gap: 8, justifyContent: "space-between" },
  nome: { flexShrink: 1, fontSize: 16, fontWeight: "700" },
});
