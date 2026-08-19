import { ApiError } from "@rotta/api-client";
import { useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import {
  useMyWallet,
  useMyWalletTransactions,
  useMyWithdrawalRequests,
  useRequestWithdrawal,
} from "../hooks/use-wallet";
import {
  WALLET_IS_CREDITO,
  WALLET_TIPO_LABEL,
  WALLET_TRANSACTION_STATUS_LABEL,
  WALLET_TRANSACTION_STATUS_TONE,
  WITHDRAWAL_STATUS_LABEL,
  WITHDRAWAL_STATUS_TONE,
} from "../labels";

import {
  StatusPill,
  VehicleButton,
  VehicleCard,
  VehicleScreen,
  VehicleTextField,
} from "@/features/vehicles/components";
import { useTheme } from "@/providers/theme-provider";

function centsToBRL(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/**
 * Carteira Rotta Pay do Motorista (Dossiê 26) — saldo, extrato e
 * solicitação de saque. Aninhada na stack de "Meu Veículo" (mesma
 * decisão de `EscolasScreen`: sem aba própria, Bottom Navigation do
 * Motorista já no limite de 3-4 itens, Dossiê 10 §11.1). Reaproveita os
 * primitivos de `@/features/vehicles/components` — mesmo padrão já
 * usado por Escolas/Marketplace/Notificações, nenhum Design System
 * nativo de tela cheia ainda existe (`@rotta/ui/native`).
 */
export function CarteiraScreen(): JSX.Element {
  const { theme } = useTheme();
  const { data: wallet, isLoading, isError } = useMyWallet();
  const { data: transactionsResult } = useMyWalletTransactions();
  const { data: withdrawalRequests } = useMyWithdrawalRequests();
  const requestWithdrawal = useRequestWithdrawal();

  const [showForm, setShowForm] = useState(false);
  const [valor, setValor] = useState("");
  const [chavePix, setChavePix] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator color={theme.colors.primary} />
      </View>
    );
  }

  if (isError || !wallet) {
    return (
      <VehicleScreen>
        <Text style={{ color: theme.colors.danger }}>
          Não foi possível carregar sua carteira Rotta Pay.
        </Text>
      </VehicleScreen>
    );
  }

  async function handleSubmit(): Promise<void> {
    setFeedback(null);
    const valorCentavos = Math.round(Number(valor.replace(",", ".")) * 100);
    if (!valorCentavos || valorCentavos <= 0) {
      setFeedback("Informe um valor válido.");
      return;
    }
    try {
      await requestWithdrawal.mutateAsync({ valorCentavos, chavePix });
      setFeedback(
        "Saque solicitado: aguardando processamento manual (integração com a provedora de pagamento ainda não está ativa).",
      );
      setValor("");
      setChavePix("");
    } catch (error) {
      setFeedback(
        error instanceof ApiError ? error.message : "Não foi possível solicitar o saque.",
      );
    }
  }

  return (
    <VehicleScreen>
      <VehicleCard>
        <Text style={[styles.label, { color: theme.colors.textMuted }]}>Saldo disponível</Text>
        <Text style={[styles.saldo, { color: theme.colors.text }]}>
          {centsToBRL(wallet.saldoDisponivelCentavos)}
        </Text>
        <Text style={{ color: theme.colors.textMuted }}>
          A receber (pendente): {centsToBRL(wallet.saldoPendenteCentavos)}
        </Text>
        <Text style={[styles.helper, { color: theme.colors.textMuted }]}>
          Mensalidades de contratos ativados aparecem aqui como pendentes até a confirmação de
          recebimento pela Rotta.
        </Text>
        <VehicleButton
          label={showForm ? "Cancelar saque" : "Solicitar saque"}
          variant="secondary"
          onPress={() => setShowForm((v) => !v)}
        />
      </VehicleCard>

      {showForm && (
        <VehicleCard>
          <VehicleTextField
            label="Valor do saque"
            value={valor}
            onChangeText={setValor}
            placeholder="0,00"
            keyboardType="decimal-pad"
          />
          <VehicleTextField label="Chave PIX" value={chavePix} onChangeText={setChavePix} />
          {feedback && <Text style={{ color: theme.colors.textMuted }}>{feedback}</Text>}
          <VehicleButton
            label="Confirmar saque"
            onPress={() => void handleSubmit()}
            isLoading={requestWithdrawal.isPending}
          />
        </VehicleCard>
      )}

      <VehicleCard>
        <Text style={[styles.title, { color: theme.colors.text }]}>Extrato</Text>
        {transactionsResult && transactionsResult.items.length > 0 ? (
          transactionsResult.items.map((transaction) => {
            const credito = WALLET_IS_CREDITO[transaction.tipo];
            return (
              <View key={transaction.id} style={styles.row}>
                <View style={styles.rowText}>
                  <Text style={{ color: theme.colors.text }}>
                    {WALLET_TIPO_LABEL[transaction.tipo]}
                  </Text>
                  <Text style={{ color: theme.colors.textMuted, fontSize: 12 }}>
                    {new Date(transaction.createdAt).toLocaleString("pt-BR")}
                  </Text>
                </View>
                <View style={styles.rowEnd}>
                  <StatusPill
                    label={WALLET_TRANSACTION_STATUS_LABEL[transaction.status]}
                    tone={WALLET_TRANSACTION_STATUS_TONE[transaction.status]}
                  />
                  <Text
                    style={{
                      color: credito ? theme.colors.success : theme.colors.danger,
                      fontWeight: "600",
                    }}
                  >
                    {credito ? "+" : "−"} {centsToBRL(transaction.valorCentavos)}
                  </Text>
                </View>
              </View>
            );
          })
        ) : (
          <Text style={{ color: theme.colors.textMuted }}>Nenhuma movimentação ainda.</Text>
        )}
      </VehicleCard>

      <VehicleCard>
        <Text style={[styles.title, { color: theme.colors.text }]}>Saques solicitados</Text>
        {withdrawalRequests && withdrawalRequests.length > 0 ? (
          withdrawalRequests.map((withdrawal) => (
            <View key={withdrawal.id} style={styles.row}>
              <View style={styles.rowText}>
                <Text style={{ color: theme.colors.text }}>
                  {centsToBRL(withdrawal.valorCentavos)}
                </Text>
                <Text style={{ color: theme.colors.textMuted, fontSize: 12 }}>
                  PIX: {withdrawal.chavePix}
                </Text>
              </View>
              <StatusPill
                label={WITHDRAWAL_STATUS_LABEL[withdrawal.status]}
                tone={WITHDRAWAL_STATUS_TONE[withdrawal.status]}
              />
            </View>
          ))
        ) : (
          <Text style={{ color: theme.colors.textMuted }}>Nenhum saque solicitado ainda.</Text>
        )}
      </VehicleCard>
    </VehicleScreen>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: "center", flex: 1, justifyContent: "center" },
  helper: { fontSize: 12 },
  label: { fontSize: 12, fontWeight: "600" },
  row: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
  },
  rowEnd: { alignItems: "flex-end", gap: 4 },
  rowText: { gap: 2 },
  saldo: { fontSize: 28, fontWeight: "700" },
  title: { fontSize: 16, fontWeight: "700", marginBottom: 4 },
});
