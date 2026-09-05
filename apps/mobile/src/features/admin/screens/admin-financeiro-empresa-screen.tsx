import { ApiError } from "@rotta/api-client";
import { useAuth } from "@rotta/auth/native";
import { Undo2 } from "@rotta/icons/native";
import { ActivityIndicator, Alert, StyleSheet, Text, View } from "react-native";

import {
  useAdminCompanyPaymentHistory,
  useCancelCompanySubscription,
  useRefundAdminPayment,
} from "../hooks/use-admin-billing";
import { PAYMENT_METODO_LABEL, PAYMENT_STATUS_LABEL, STATUS_ESTORNAVEL } from "../labels";

import type { AdminFinanceiroStackParamList } from "@/navigation/types";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import {
  StatusPill,
  VehicleButton,
  VehicleCard,
  VehicleScreen,
} from "@/features/vehicles/components";
import { useTheme } from "@/providers/theme-provider";

type Props = NativeStackScreenProps<AdminFinanceiroStackParamList, "Empresa">;

function centsToBRL(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof ApiError ? error.message : fallback;
}

/**
 * Extrato completo de pagamentos de UMA empresa (pedido do usuário
 * 03/09/2026: "extrato completo de cada usuário que adquiriu o plano"),
 * agora também no app (pedido 05/09/2026: "financeiro completo") —
 * espelha `CompanyPaymentHistoryRow` expandida (apps/admin). Estornar/
 * cancelar assinatura são GERAL-only no backend; aqui só decide se o
 * BOTÃO aparece — mesmo raciocínio de `AdminFinanceiroTransferenciaScreen`.
 */
export function AdminFinanceiroEmpresaScreen({ route }: Props): JSX.Element {
  const { companyId, companyNome } = route.params;
  const { theme } = useTheme();
  const { user } = useAuth();
  const podeGerenciar = (user?.adminPapel ?? "GERAL") === "GERAL";

  const { data, isLoading, isError } = useAdminCompanyPaymentHistory(companyId, true);
  const cancelarAssinatura = useCancelCompanySubscription();
  const estornarPagamento = useRefundAdminPayment();

  function handleCancelarAssinatura(): void {
    Alert.alert(
      "Cancelar assinatura",
      `Cancelar a assinatura Asaas de ${companyNome}? Ela para de ser cobrada e o status vira CANCELADO — não dá pra desfazer por aqui.`,
      [
        { text: "Voltar", style: "cancel" },
        {
          text: "Cancelar assinatura",
          style: "destructive",
          onPress: () => {
            cancelarAssinatura.mutate(companyId, {
              onError: (err) =>
                Alert.alert(
                  "Erro",
                  errorMessage(err, "Não foi possível cancelar a assinatura. Tente novamente."),
                ),
            });
          },
        },
      ],
    );
  }

  function handleEstornar(pagamentoId: string, valorCentavos: number): void {
    Alert.alert(
      "Estornar pagamento",
      `Estornar o pagamento de ${centsToBRL(valorCentavos)}? O valor volta pro pagador e sai da conta da Rotta.`,
      [
        { text: "Voltar", style: "cancel" },
        {
          text: "Estornar",
          style: "destructive",
          onPress: () => {
            estornarPagamento.mutate(pagamentoId, {
              onError: (err) =>
                Alert.alert(
                  "Erro",
                  errorMessage(err, "Não foi possível estornar o pagamento. Tente novamente."),
                ),
            });
          },
        },
      ],
    );
  }

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
        <Text style={{ color: theme.colors.danger }}>
          Não foi possível carregar os pagamentos de {companyNome}.
        </Text>
      </VehicleScreen>
    );
  }

  return (
    <VehicleScreen>
      {podeGerenciar ? (
        <VehicleButton
          label="Cancelar assinatura"
          variant="danger"
          icon={<Undo2 size={16} color="#FFFFFF" />}
          isLoading={cancelarAssinatura.isPending}
          onPress={handleCancelarAssinatura}
        />
      ) : null}

      {data.note ? (
        <Text style={{ color: theme.colors.textMuted, fontSize: 12 }}>{data.note}</Text>
      ) : null}

      {data.items.length === 0 ? (
        <Text style={{ color: theme.colors.textMuted }}>
          Nenhum pagamento encontrado pra esta empresa.
        </Text>
      ) : (
        data.items.map((item) => (
          <VehicleCard key={item.id}>
            <View style={styles.linhaTopo}>
              <Text style={{ color: theme.colors.textMuted, fontSize: 12 }}>
                {item.data ? new Date(item.data).toLocaleDateString("pt-BR") : "-"} ·{" "}
                {PAYMENT_METODO_LABEL[item.metodo] ?? item.metodo}
              </Text>
              <StatusPill
                label={PAYMENT_STATUS_LABEL[item.status] ?? item.status}
                tone={item.status === "REFUNDED" ? "neutral" : "info"}
              />
            </View>
            <View style={styles.linhaTopo}>
              <Text style={{ color: theme.colors.text, fontWeight: "700" }}>
                {centsToBRL(item.valorCentavos)}
              </Text>
              <Text style={{ color: theme.colors.textMuted, fontSize: 12 }}>
                líquido {item.liquidoCentavos === null ? "-" : centsToBRL(item.liquidoCentavos)}
              </Text>
            </View>
            {podeGerenciar && STATUS_ESTORNAVEL.has(item.status) ? (
              <VehicleButton
                label="Estornar"
                variant="secondary"
                icon={<Undo2 size={14} color={theme.colors.text} />}
                isLoading={estornarPagamento.isPending}
                onPress={() => handleEstornar(item.id, item.valorCentavos)}
              />
            ) : null}
          </VehicleCard>
        ))
      )}
    </VehicleScreen>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: "center", flex: 1, justifyContent: "center" },
  linhaTopo: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
});
