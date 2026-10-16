import { ApiError } from "@rotta/api-client";
import { Star } from "@rotta/icons/native";
import { useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";

import {
  useAssinarContratoComoEmpresa,
  useContract,
  useContractRatings,
} from "../hooks/use-empresa-marketplace";

import type { EmpresaHomeStackParamList } from "@/navigation/types";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { Texto } from "@/components/texto";
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
        <Texto style={{ color: theme.colors.danger }}>
          Não foi possível carregar este contrato.
        </Texto>
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
          <Texto style={{ color: theme.colors.text, fontWeight: "700", fontSize: 16 }}>
            Contrato
          </Texto>
          <StatusPill
            label={CONTRACT_STATUS_LABEL[contract.status]}
            tone={CONTRACT_STATUS_TONE[contract.status]}
          />
        </View>
        <Texto style={{ color: theme.colors.text, fontWeight: "600" }}>
          Mensalidade: {centsToBRL(contract.valorMensalidadeCentavos)}
        </Texto>
        <Texto style={{ color: theme.colors.textMuted, fontSize: 14 }}>
          Plano: {contract.planoDescricao}
        </Texto>
        <Texto style={{ color: theme.colors.textMuted, fontSize: 14 }}>
          Regras: {contract.regras}
        </Texto>
        <Texto style={{ color: theme.colors.textMuted, fontSize: 14 }}>
          Vigência: {new Date(contract.vigenciaInicio).toLocaleDateString("pt-BR")}
          {contract.vigenciaFim
            ? ` até ${new Date(contract.vigenciaFim).toLocaleDateString("pt-BR")}`
            : ""}
        </Texto>
      </VehicleCard>

      {errorMessage ? <Texto style={{ color: theme.colors.danger }}>{errorMessage}</Texto> : null}

      {contract.status === "AGUARDANDO_ASSINATURA" ? (
        <VehicleCard>
          {contract.assinadoEmpresaEm ? (
            <Texto style={{ color: theme.colors.textMuted, fontSize: 14 }}>
              Já assinado pela sua empresa em{" "}
              {new Date(contract.assinadoEmpresaEm).toLocaleDateString("pt-BR")}. Aguardando a
              assinatura da família.
            </Texto>
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
        <Texto style={{ color: theme.colors.textMuted, fontWeight: "600", fontSize: 14 }}>
          Avaliações recebidas
        </Texto>
        {!ratings || ratings.length === 0 ? (
          <Texto style={{ color: theme.colors.textMuted, fontSize: 14 }}>
            Nenhuma avaliação recebida ainda.
          </Texto>
        ) : (
          ratings.map((rating) => (
            <View key={rating.id} style={styles.ratingRow}>
              <View style={styles.linha}>
                <Texto style={{ color: theme.colors.text, fontSize: 14 }}>
                  {RATING_TARGET_LABEL[rating.alvoTipo]}
                </Texto>
                <View style={styles.notaRow}>
                  <Star size={14} color={theme.colors.warning} fill={theme.colors.warning} />
                  <Texto style={{ color: theme.colors.text, fontSize: 14 }}>{rating.nota}</Texto>
                </View>
              </View>
              {rating.comentario ? (
                <Texto style={{ color: theme.colors.textMuted, fontSize: 12 }}>
                  {rating.comentario}
                </Texto>
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
