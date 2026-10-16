import { ApiError } from "@rotta/api-client";
import { useAuth } from "@rotta/auth/native";
import { Receipt, Undo2 } from "@rotta/icons/native";
import { EmptyState, MovementRow, SectionHeader } from "@rotta/ui/native";
import { ActivityIndicator, Alert, StyleSheet, Text, View } from "react-native";

import {
  useAdminCompanyPaymentHistory,
  useCancelCompanySubscription,
  useRefundAdminPayment,
} from "../hooks/use-admin-billing";
import { PAYMENT_METODO_LABEL, PAYMENT_STATUS_LABEL, STATUS_ESTORNAVEL } from "../labels";

import type { AdminFinanceiroStackParamList } from "@/navigation/types";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { VehicleButton, VehicleCard, VehicleScreen } from "@/features/vehicles/components";
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
 *
 * ## O que mudou em 16/10/2026
 *
 * Mesma linguagem do extrato da conta e da carteira do transportador:
 * `MovementRow`, `SectionHeader` e `EmptyState`. E dois consertos:
 *
 * **O botão vermelho de cancelar assinatura saiu do topo.** Ele era o
 * primeiro elemento da tela, antes de qualquer pagamento, no lugar onde
 * o polegar cai ao abrir. A ação destrutiva de uma empresa inteira
 * agora fica no fim, depois do histórico que justifica a decisão.
 *
 * **Estorno deixou de ser um pagamento igual aos outros.** Um
 * pagamento estornado é dinheiro que voltou, e aparecia com o mesmo
 * sinal de quem pagou. Agora ele é saída, com sinal próprio.
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
      `Cancelar a assinatura Asaas de ${companyNome}? Ela para de ser cobrada e o status vira CANCELADO. Não dá pra desfazer por aqui.`,
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
      <View>
        <SectionHeader title="Pagamentos da empresa" theme={theme} />
        {data.note ? (
          <Text style={[styles.nota, { color: theme.colors.textMuted }]}>{data.note}</Text>
        ) : null}

        {data.items.length === 0 ? (
          <EmptyState
            title="Nenhum pagamento encontrado"
            description={`${companyNome} não tem cobrança paga, pendente ou estornada no Asaas.`}
            icon={<Receipt size={28} color={theme.colors.textMuted} />}
            theme={theme}
          />
        ) : (
          data.items.map((item) => {
            const estornado = item.status === "REFUNDED";
            const liquido = item.liquidoCentavos === null ? "-" : centsToBRL(item.liquidoCentavos);

            return (
              <VehicleCard key={item.id}>
                <MovementRow
                  titulo={PAYMENT_METODO_LABEL[item.metodo] ?? item.metodo}
                  subtitulo={`${PAYMENT_STATUS_LABEL[item.status] ?? item.status} · líquido ${liquido}`}
                  valorFormatado={centsToBRL(item.valorCentavos)}
                  /* Estornado é dinheiro que voltou pro pagador: saída,
                     e não mais uma entrada igual às outras. */
                  direcao={estornado ? "saida" : "entrada"}
                  data={item.data ? new Date(item.data).toLocaleDateString("pt-BR") : undefined}
                  theme={theme}
                />
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
            );
          })
        )}
      </View>

      {/*
        No fim, e não no topo: cancelar a assinatura tira a empresa
        inteira da cobrança, e a decisão só faz sentido depois de ver o
        histórico acima.
      */}
      {podeGerenciar ? (
        <View style={styles.zonaDeRisco}>
          <SectionHeader title="Assinatura" theme={theme} />
          <Text style={[styles.nota, { color: theme.colors.textMuted }]}>
            Cancelar faz {companyNome} parar de ser cobrada. Não dá pra desfazer por aqui.
          </Text>
          <VehicleButton
            label="Cancelar assinatura"
            variant="danger"
            icon={<Undo2 size={16} color={theme.colors.onPrimary} />}
            isLoading={cancelarAssinatura.isPending}
            onPress={handleCancelarAssinatura}
          />
        </View>
      ) : null}
    </VehicleScreen>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: "center", flex: 1, justifyContent: "center" },
  nota: { fontSize: 12 },
  zonaDeRisco: { gap: 8 },
});
