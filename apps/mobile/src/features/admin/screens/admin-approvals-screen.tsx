import { ActivityIndicator, StyleSheet, View } from "react-native";

import { useAdminApprovalQueue } from "../hooks/use-admin-backoffice";

import type { AdminHomeStackParamList } from "@/navigation/types";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { Texto } from "@/components/texto";
import {
  StatusPill,
  VehicleButton,
  VehicleCard,
  VehicleScreen,
} from "@/features/vehicles/components";
import { useTheme } from "@/providers/theme-provider";

type Props = NativeStackScreenProps<AdminHomeStackParamList, "Aprovacoes">;

/**
 * Central de Aprovações no app (pedido do usuário 05/09/2026) — espelha
 * `apps/admin/src/app/(admin)/aprovacoes/page.tsx`: documentos de
 * motorista, documentos de veículo e contratos aguardando assinatura.
 * Somente leitura nesta fase, igual à Web — aprovar/reprovar em lote
 * continua "Plano de evolução" do Dossiê 29, em ambas as plataformas.
 */
export function AdminApprovalsScreen(_props: Props): JSX.Element {
  const { theme } = useTheme();
  const { data, isLoading, isError, refetch } = useAdminApprovalQueue(50);

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator color={theme.colors.primary} />
      </View>
    );
  }

  if (isError || !data) {
    return (
      <VehicleScreen>
        <Texto style={{ color: theme.colors.danger }}>
          Não foi possível carregar a fila de aprovações.
        </Texto>
        <VehicleButton label="Tentar novamente" onPress={() => void refetch()} />
      </VehicleScreen>
    );
  }

  const isEmpty =
    data.documentosMotorista.length === 0 &&
    data.documentosVeiculo.length === 0 &&
    data.contratos.length === 0;

  return (
    <VehicleScreen>
      {isEmpty ? (
        <Texto style={{ color: theme.colors.textMuted }}>
          Nenhum item pendente de revisão no momento.
        </Texto>
      ) : null}

      {data.documentosMotorista.length > 0 ? (
        <View style={styles.secao}>
          <Texto style={[styles.secaoTitulo, { color: theme.colors.text }]}>
            Documentos de motorista ({data.documentosMotorista.length})
          </Texto>
          {data.documentosMotorista.map((doc) => (
            <VehicleCard key={doc.id}>
              <View style={styles.linha}>
                <View style={{ flex: 1 }}>
                  <Texto style={{ color: theme.colors.text, fontWeight: "600" }} numberOfLines={1}>
                    {doc.userNome} · {doc.tipo}
                  </Texto>
                  <Texto style={{ color: theme.colors.textMuted, fontSize: 12 }}>
                    {doc.companyNome} · {new Date(doc.createdAt).toLocaleDateString("pt-BR")}
                  </Texto>
                </View>
                <StatusPill
                  label={doc.rottaAiStatus}
                  tone={doc.rottaAiStatus === "REPROVADO" ? "danger" : "warning"}
                />
              </View>
            </VehicleCard>
          ))}
        </View>
      ) : null}

      {data.documentosVeiculo.length > 0 ? (
        <View style={styles.secao}>
          <Texto style={[styles.secaoTitulo, { color: theme.colors.text }]}>
            Documentos de veículo ({data.documentosVeiculo.length})
          </Texto>
          {data.documentosVeiculo.map((doc) => (
            <VehicleCard key={doc.id}>
              <View style={styles.linha}>
                <View style={{ flex: 1 }}>
                  <Texto style={{ color: theme.colors.text, fontWeight: "600" }} numberOfLines={1}>
                    {doc.vehiclePlaca} · {doc.tipo}
                  </Texto>
                  <Texto style={{ color: theme.colors.textMuted, fontSize: 12 }}>
                    {doc.companyNome} · {new Date(doc.createdAt).toLocaleDateString("pt-BR")}
                  </Texto>
                </View>
                <StatusPill
                  label={doc.rottaAiStatus}
                  tone={doc.rottaAiStatus === "REPROVADO" ? "danger" : "warning"}
                />
              </View>
            </VehicleCard>
          ))}
        </View>
      ) : null}

      {data.contratos.length > 0 ? (
        <View style={styles.secao}>
          <Texto style={[styles.secaoTitulo, { color: theme.colors.text }]}>
            Contratos aguardando assinatura ({data.contratos.length})
          </Texto>
          {data.contratos.map((contract) => (
            <VehicleCard key={contract.id}>
              <View style={styles.linha}>
                <View style={{ flex: 1 }}>
                  <Texto style={{ color: theme.colors.text, fontWeight: "600" }} numberOfLines={1}>
                    {contract.studentNome}
                  </Texto>
                  <Texto style={{ color: theme.colors.textMuted, fontSize: 12 }}>
                    {contract.companyNome} ·{" "}
                    {new Date(contract.createdAt).toLocaleDateString("pt-BR")}
                  </Texto>
                </View>
                <StatusPill label={contract.status} tone="warning" />
              </View>
            </VehicleCard>
          ))}
        </View>
      ) : null}
    </VehicleScreen>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: "center", flex: 1, justifyContent: "center" },
  linha: { alignItems: "center", flexDirection: "row", gap: 8, justifyContent: "space-between" },
  secao: { gap: 8 },
  secaoTitulo: { fontSize: 14, fontWeight: "700" },
});
