import { FileText } from "@rotta/icons/native";
import { EmptyState } from "@rotta/ui/native";
import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";

import { useContractsList } from "../hooks/use-empresa-marketplace";

import type { EmpresaHomeStackParamList } from "@/navigation/types";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { ContractStatus } from "@rotta/api-client";

import { Texto } from "@/components/texto";
import { CONTRACT_STATUS_LABEL, CONTRACT_STATUS_TONE } from "@/features/marketplace/labels";
import {
  StatusPill,
  VehicleButton,
  VehicleCard,
  VehicleScreen,
} from "@/features/vehicles/components";
import { useTheme } from "@/providers/theme-provider";

type Props = NativeStackScreenProps<EmpresaHomeStackParamList, "MarketplaceContratos">;

const STATUS_OPTIONS: ContractStatus[] = ["AGUARDANDO_ASSINATURA", "ATIVO", "ENCERRADO"];

function centsToBRL(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/**
 * Contratos do Marketplace (Frente A) — mirror de
 * `apps/web/.../marketplace/contratos/page.tsx`: a API não tem filtro
 * de status (só página/tamanho), então o filtro abaixo é aplicado
 * sobre o lote já carregado — mesma decisão da Web, nunca duplicar uma
 * regra de escopo que o backend já resolve.
 */
export function EmpresaMarketplaceContratosScreen({ navigation }: Props): JSX.Element {
  const { theme } = useTheme();
  const [status, setStatus] = useState<ContractStatus | null>(null);
  const { data, isLoading, isError, refetch } = useContractsList({ pageSize: 100 });

  const items = status ? (data?.items ?? []).filter((c) => c.status === status) : data?.items;

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator color={theme.colors.primary} />
      </View>
    );
  }

  if (isError) {
    return (
      <VehicleScreen>
        <Texto style={{ color: theme.colors.danger }}>
          Não foi possível carregar os contratos.
        </Texto>
        <VehicleButton label="Tentar novamente" onPress={() => void refetch()} />
      </VehicleScreen>
    );
  }

  return (
    <VehicleScreen>
      <Texto style={{ color: theme.colors.textMuted, fontSize: 14 }}>
        Contratos gerados a partir de solicitações de transporte aprovadas.
      </Texto>

      <View style={styles.chips}>
        <VehicleButton
          label="Todos"
          variant={status === null ? "primary" : "secondary"}
          onPress={() => setStatus(null)}
        />
        {STATUS_OPTIONS.map((value) => (
          <VehicleButton
            key={value}
            label={CONTRACT_STATUS_LABEL[value]}
            variant={status === value ? "primary" : "secondary"}
            onPress={() => setStatus(value)}
          />
        ))}
      </View>

      {!items || items.length === 0 ? (
        <EmptyState
          title="Nenhum contrato"
          description="Os contratos aparecem quando uma família aceita a sua proposta."
          icon={<FileText size={28} color={theme.colors.primary} />}
          theme={theme}
        />
      ) : (
        items.map((contract) => (
          <Pressable
            accessibilityRole="button"
            key={contract.id}
            onPress={() =>
              navigation.navigate("MarketplaceContratoDetalhe", { contractId: contract.id })
            }
          >
            <VehicleCard style={styles.card}>
              <View style={styles.linha}>
                <Texto style={{ color: theme.colors.text, fontWeight: "600" }}>
                  {centsToBRL(contract.valorMensalidadeCentavos)}/mês
                </Texto>
                <StatusPill
                  label={CONTRACT_STATUS_LABEL[contract.status]}
                  tone={CONTRACT_STATUS_TONE[contract.status]}
                />
              </View>
              <Texto style={{ color: theme.colors.textMuted, fontSize: 14 }}>
                Vigência: {new Date(contract.vigenciaInicio).toLocaleDateString("pt-BR")}
              </Texto>
            </VehicleCard>
          </Pressable>
        ))
      )}
    </VehicleScreen>
  );
}

const styles = StyleSheet.create({
  card: { gap: 4 },
  center: { alignItems: "center", flex: 1, justifyContent: "center" },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  linha: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
});
