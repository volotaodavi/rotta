import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import { useTransportRequestsList } from "../hooks/use-empresa-marketplace";

import type { EmpresaHomeStackParamList } from "@/navigation/types";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { TransportRequestStatus } from "@rotta/api-client";

import {
  TRANSPORT_REQUEST_STATUS_LABEL,
  TRANSPORT_REQUEST_STATUS_TONE,
} from "@/features/marketplace/labels";
import {
  StatusPill,
  VehicleButton,
  VehicleCard,
  VehicleScreen,
} from "@/features/vehicles/components";
import { useTheme } from "@/providers/theme-provider";

type Props = NativeStackScreenProps<EmpresaHomeStackParamList, "MarketplaceSolicitacoes">;

const STATUS_OPTIONS: TransportRequestStatus[] = ["RECEBIDA", "EM_ANALISE", "APROVADA", "RECUSADA"];

/**
 * Solicitações de transporte recebidas pelo Marketplace (Frente A do
 * plano "lacunas Empresa/Gestor no app" — pedido do usuário
 * 12/09/2026: "o app é o principal... traga o que tem na Web pro
 * app"). Antes desta Frente, uma família mandando uma solicitação só
 * era vista abrindo a Web — mirror de
 * `apps/web/.../marketplace/solicitacoes/page.tsx`, trocando a tabela
 * por cartões e o `<select>` por chips (mesmo padrão já usado em
 * `novo-chamado-screen.tsx`).
 */
export function EmpresaMarketplaceSolicitacoesScreen({ navigation }: Props): JSX.Element {
  const { theme } = useTheme();
  const [status, setStatus] = useState<TransportRequestStatus | null>(null);
  const { data, isLoading, isError, refetch } = useTransportRequestsList({
    status: status ?? undefined,
    pageSize: 100,
  });

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
        <Text style={{ color: theme.colors.danger }}>
          Não foi possível carregar as solicitações.
        </Text>
        <VehicleButton label="Tentar novamente" onPress={() => void refetch()} />
      </VehicleScreen>
    );
  }

  return (
    <VehicleScreen>
      <Text style={{ color: theme.colors.textMuted, fontSize: 14 }}>
        Famílias que solicitaram transporte com a sua empresa pelo Marketplace da Rotta.
      </Text>

      <View style={styles.chips}>
        <VehicleButton
          label="Todos"
          variant={status === null ? "primary" : "secondary"}
          onPress={() => setStatus(null)}
        />
        {STATUS_OPTIONS.map((value) => (
          <VehicleButton
            key={value}
            label={TRANSPORT_REQUEST_STATUS_LABEL[value]}
            variant={status === value ? "primary" : "secondary"}
            onPress={() => setStatus(value)}
          />
        ))}
      </View>

      {!data || data.items.length === 0 ? (
        <Text style={{ color: theme.colors.textMuted }}>
          Nenhuma solicitação de transporte recebida ainda.
        </Text>
      ) : (
        data.items.map((request) => (
          <Pressable
            key={request.id}
            onPress={() =>
              navigation.navigate("MarketplaceSolicitacaoDetalhe", {
                transportRequestId: request.id,
              })
            }
          >
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
              </Text>
              <Text style={{ color: theme.colors.textMuted, fontSize: 14 }}>
                Escola: {request.schoolNome ?? "Não informada"}
              </Text>
              <Text style={{ color: theme.colors.textMuted, fontSize: 12 }}>
                Recebida em {new Date(request.createdAt).toLocaleDateString("pt-BR")}
              </Text>
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
  linha: { alignItems: "center", flexDirection: "row", gap: 8, justifyContent: "space-between" },
  nome: { flexShrink: 1, fontSize: 16, fontWeight: "600" },
});
