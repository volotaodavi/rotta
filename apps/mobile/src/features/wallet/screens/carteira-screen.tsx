import { ApiError } from "@rotta/api-client";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  CreditCard,
  Eye,
  EyeOff,
  Receipt,
  Wallet,
} from "@rotta/icons/native";
import { ActionGrid, BalanceCard, EmptyState, MovementRow, SectionHeader } from "@rotta/ui/native";
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

/** Só a data, sem hora: extrato com hora em cada linha vira ruído. */
function comoDia(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR");
}

/**
 * Carteira Rotta Pay do transportador — saldo, extrato e saque.
 *
 * ## O que mudou em 16/10/2026
 *
 * Esta é a tela do telefone da esquerda no segundo conceito visual que
 * o fundador enviou, e era a que faltava receber a mesma linguagem da
 * tela de Pagamentos. Ela passou a usar `BalanceCard`, `ActionGrid`,
 * `MovementRow`, `SectionHeader` e `EmptyState`, que foram construídos
 * justamente para ela e até aqui não tinham sido aplicados a tela
 * nenhuma.
 *
 * Três consertos de verdade vieram junto:
 *
 * **O saldo pode ser escondido.** O transportador abre o app dentro da
 * van, com passageiro atrás e gente ao lado na escola, e a tela fica no
 * suporte a viagem inteira. Saldo sempre visível ali é exposição real.
 *
 * **Saída deixou de ser vermelha.** O extrato pintava todo débito de
 * vermelho, o que faz um extrato saudável parecer um desastre: gastar
 * não é erro. O sinal continua no texto, que é o que sobra para quem
 * não distingue verde de vermelho.
 *
 * **Lista vazia virou estado vazio.** Eram duas frases soltas
 * ("Nenhuma movimentação ainda.") encostadas na borda do cartão.
 *
 * ## O que a tela NÃO promete
 *
 * O conceito mostra Receber, Pix, Transferir, Pagar, Seguros e Cartão.
 * Desses, só o saque existe: os outros dependem de instituição
 * financeira parceira, e a conversa com o Banco Rendimento ainda não
 * aconteceu. Eles aparecem apagados, com o motivo à mostra, em vez de
 * sumir ou de abrir e dar erro.
 */
export function CarteiraScreen(): JSX.Element {
  const { theme } = useTheme();
  const { data: wallet, isLoading, isError } = useMyWallet();
  const { data: transactionsResult } = useMyWalletTransactions();
  const { data: withdrawalRequests } = useMyWithdrawalRequests();
  const requestWithdrawal = useRequestWithdrawal();

  const [showForm, setShowForm] = useState(false);
  /* Estado de sessão, e não preferência guardada: esconder o saldo é
     decisão do momento ("tem gente do meu lado agora"), não ajuste. */
  const [saldoVisivel, setSaldoVisivel] = useState(true);
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

  const transacoes = transactionsResult?.items ?? [];
  const saques = withdrawalRequests ?? [];

  return (
    <VehicleScreen>
      <BalanceCard
        label="Saldo disponível"
        valorFormatado={centsToBRL(wallet.saldoDisponivelCentavos)}
        visivel={saldoVisivel}
        onAlternarVisibilidade={() => setSaldoVisivel((v) => !v)}
        iconeVisivel={<Eye size={18} color={theme.colors.onPrimary} />}
        iconeOculto={<EyeOff size={18} color={theme.colors.onPrimary} />}
        theme={theme}
      />

      <VehicleCard>
        <Text style={{ color: theme.colors.textMuted }}>
          A receber (pendente): {centsToBRL(wallet.saldoPendenteCentavos)}
        </Text>
        <Text style={[styles.helper, { color: theme.colors.textMuted }]}>
          Mensalidades de contratos ativados aparecem aqui como pendentes até a confirmação de
          recebimento pela Rotta.
        </Text>
      </VehicleCard>

      <ActionGrid
        items={[
          {
            key: "saque",
            label: showForm ? "Cancelar" : "Sacar",
            icon: <ArrowDownToLine size={20} color={theme.colors.primary} />,
            onPress: () => setShowForm((v) => !v),
          },
          {
            key: "transferir",
            label: "Transferir",
            icon: <ArrowUpFromLine size={20} color={theme.colors.primary} />,
            onPress: () => undefined,
            motivoIndisponivel: "depende de parceiro bancário",
          },
          {
            key: "pagar",
            label: "Pagar",
            icon: <Receipt size={20} color={theme.colors.primary} />,
            onPress: () => undefined,
            motivoIndisponivel: "depende de parceiro bancário",
          },
          {
            key: "cartao",
            label: "Cartão",
            icon: <CreditCard size={20} color={theme.colors.primary} />,
            onPress: () => undefined,
            motivoIndisponivel: "depende de parceiro bancário",
          },
        ]}
        theme={theme}
      />

      {showForm ? (
        <VehicleCard>
          <VehicleTextField
            label="Valor do saque"
            value={valor}
            onChangeText={setValor}
            placeholder="0,00"
            keyboardType="decimal-pad"
          />
          <VehicleTextField label="Chave PIX" value={chavePix} onChangeText={setChavePix} />
          {feedback ? <Text style={{ color: theme.colors.textMuted }}>{feedback}</Text> : null}
          <VehicleButton
            label="Confirmar saque"
            onPress={() => void handleSubmit()}
            isLoading={requestWithdrawal.isPending}
          />
        </VehicleCard>
      ) : null}

      <View>
        <SectionHeader title="Extrato" theme={theme} />
        {transacoes.length === 0 ? (
          <EmptyState
            title="Nenhuma movimentação ainda"
            description="Mensalidades recebidas e saques aparecem aqui."
            icon={<Wallet size={28} color={theme.colors.textMuted} />}
            theme={theme}
          />
        ) : (
          <VehicleCard>
            {transacoes.map((transaction) => (
              <MovementRow
                key={transaction.id}
                titulo={WALLET_TIPO_LABEL[transaction.tipo]}
                subtitulo={WALLET_TRANSACTION_STATUS_LABEL[transaction.status]}
                valorFormatado={centsToBRL(transaction.valorCentavos)}
                direcao={WALLET_IS_CREDITO[transaction.tipo] ? "entrada" : "saida"}
                data={comoDia(transaction.createdAt)}
                theme={theme}
              />
            ))}
          </VehicleCard>
        )}
      </View>

      <View>
        <SectionHeader title="Saques solicitados" theme={theme} />
        {saques.length === 0 ? (
          <EmptyState
            title="Nenhum saque solicitado"
            description="O dinheiro disponível pode ser enviado para a sua chave Pix."
            theme={theme}
          />
        ) : (
          <VehicleCard>
            {saques.map((withdrawal) => (
              <View key={withdrawal.id} style={styles.row}>
                <View style={styles.rowText}>
                  <Text style={[styles.saqueValor, { color: theme.colors.text }]}>
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
            ))}
          </VehicleCard>
        )}
      </View>
    </VehicleScreen>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: "center", flex: 1, justifyContent: "center" },
  helper: { fontSize: 12 },
  row: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
    paddingVertical: 8,
  },
  rowText: { flex: 1, gap: 2, minWidth: 0 },
  saqueValor: { fontSize: 15, fontVariant: ["tabular-nums"], fontWeight: "600" },
});
