import { ApiError } from "@rotta/api-client";
import { Star } from "@rotta/icons/native";
import { useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import {
  useAssinarContratoComoEmpresa,
  useContract,
  useContractRatings,
} from "../hooks/use-empresa-marketplace";

import type { EmpresaHomeStackParamList } from "@/navigation/types";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import {
  CONTRACT_STATUS_LABEL,
  CONTRACT_STATUS_TONE,
  RATING_TARGET_LABEL,
} from "@/features/marketplace/labels";
import {
  StatusPill,
  VehicleButton,
  VehicleCard,
  VehicleScreen,
} from "@/features/vehicles/components";
import { useTheme } from "@/providers/theme-provider";

type Props = NativeStackScreenProps<EmpresaHomeStackParamList, "MarketplaceContratoDetalhe">;

function centsToBRL(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/**
 * Detalhe de um contrato do Marketplace (Frente A) — dados completos,
 * assinatura pela Empresa (quando pendente) e avaliações recebidas da
 * família após o transporte (leitura — a criação é exclusiva do
 * Responsável). Mirror de `apps/web/.../marketplace/contratos/[id]/page.tsx`.
 * Aluno/escola aparecem só pelo ID (sem nome), mesma honestidade da
 * Web — `Contract` não traz esse join, nunca inventar um nome aqui.
 */
export function EmpresaMarketplaceContratoDetalheScreen({ route }: Props): JSX.Element {
  const { theme } = useTheme();
  const { contractId } = route.params;
  const { data: contract, isLoading, isError, refetch } = useContract(contractId);
  const { data: ratings } = useContractRatings(contractId);
  const assinar = useAssinarContratoComoEmpresa(contractId);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator color={theme.colors.primary} />
      </View>
    );
  }

  if (isError || !contract) {
    return (
      <VehicleScreen>
        <Text style={{ color: theme.colors.danger }}>Não foi possível carregar este contrato.</Text>
        <VehicleButton label="Tentar novamente" onPress={() => void refetch()} />
      </VehicleScreen>
    );
  }

  async function handleAssinar(): Promise<void> {
    setErrorMessage(null);
    try {
      await assinar.mutateAsync();
    } catch (error) {
      setErrorMessage(error instanceof ApiError ? error.message : "Erro inesperado ao assinar.");
    }
  }

  return (
    <VehicleScreen>
      <VehicleCard style={styles.card}>
        <View style={styles.linha}>
          <Text style={{ color: theme.colors.text, fontWeight: "700", fontSize: 16 }}>
            Contrato
          </Text>
          <StatusPill
            label={CONTRACT_STATUS_LABEL[contract.status]}
            tone={CONTRACT_STATUS_TONE[contract.status]}
          />
        </View>
        <Text style={{ color: theme.colors.text, fontWeight: "600" }}>
          Mensalidade: {centsToBRL(contract.valorMensalidadeCentavos)}
        </Text>
        <Text style={{ color: theme.colors.textMuted, fontSize: 13 }}>
          Plano: {contract.planoDescricao}
        </Text>
        <Text style={{ color: theme.colors.textMuted, fontSize: 13 }}>
          Regras: {contract.regras}
        </Text>
        <Text style={{ color: theme.colors.textMuted, fontSize: 13 }}>
          Vigência: {new Date(contract.vigenciaInicio).toLocaleDateString("pt-BR")}
          {contract.vigenciaFim
            ? ` até ${new Date(contract.vigenciaFim).toLocaleDateString("pt-BR")}`
            : ""}
        </Text>
      </VehicleCard>

      {errorMessage ? <Text style={{ color: theme.colors.danger }}>{errorMessage}</Text> : null}

      {contract.status === "AGUARDANDO_ASSINATURA" ? (
        <VehicleCard>
          {contract.assinadoEmpresaEm ? (
            <Text style={{ color: theme.colors.textMuted, fontSize: 13 }}>
              Já assinado pela sua empresa em{" "}
              {new Date(contract.assinadoEmpresaEm).toLocaleDateString("pt-BR")}. Aguardando a
              assinatura da família.
            </Text>
          ) : (
            <VehicleButton
              label="Assinar contrato"
              isLoading={assinar.isPending}
              onPress={() => void handleAssinar()}
            />
          )}
        </VehicleCard>
      ) : null}

      <VehicleCard style={styles.card}>
        <Text style={{ color: theme.colors.textMuted, fontWeight: "600", fontSize: 13 }}>
          Avaliações recebidas
        </Text>
        {!ratings || ratings.length === 0 ? (
          <Text style={{ color: theme.colors.textMuted, fontSize: 13 }}>
            Nenhuma avaliação recebida ainda.
          </Text>
        ) : (
          ratings.map((rating) => (
            <View key={rating.id} style={styles.ratingRow}>
              <View style={styles.linha}>
                <Text style={{ color: theme.colors.text, fontSize: 13 }}>
                  {RATING_TARGET_LABEL[rating.alvoTipo]}
                </Text>
                <View style={styles.notaRow}>
                  <Star size={14} color={theme.colors.warning} fill={theme.colors.warning} />
                  <Text style={{ color: theme.colors.text, fontSize: 13 }}>{rating.nota}</Text>
                </View>
              </View>
              {rating.comentario ? (
                <Text style={{ color: theme.colors.textMuted, fontSize: 12 }}>
                  {rating.comentario}
                </Text>
              ) : null}
            </View>
          ))
        )}
      </VehicleCard>
    </VehicleScreen>
  );
}

const styles = StyleSheet.create({
  card: { gap: 6 },
  center: { alignItems: "center", flex: 1, justifyContent: "center" },
  linha: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  notaRow: { alignItems: "center", flexDirection: "row", gap: 4 },
  ratingRow: { gap: 2, paddingVertical: 4 },
});
