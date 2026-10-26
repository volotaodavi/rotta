import { useNavigation } from "@react-navigation/native";
import { ApiError } from "@rotta/api-client";
import { useAuth } from "@rotta/auth/native";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Bell,
  ChevronDown,
  ChevronLeft,
  CreditCard,
  Eye,
  EyeOff,
  Receipt,
  Wallet,
} from "@rotta/icons/native";
import {
  AccountHeader,
  ActionGrid,
  ContentSheet,
  EmptyState,
  iniciaisDe,
  MovementRow,
  SectionHeader,
} from "@rotta/ui/native";
import { formatarCentavos, reaisParaCentavos } from "@rotta/utils";
import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ContaDeRecebimentoCard } from "../components/conta-de-recebimento-card";
import { useContaDeRecebimento, useCriarSubconta } from "../hooks/use-conta-de-recebimento";
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
  WITHDRAWAL_STATUS_LABEL,
  WITHDRAWAL_STATUS_TONE,
} from "../labels";

import { RottaLogo } from "@/components/rotta-logo";
import { Texto } from "@/components/texto";
import {
  StatusPill,
  VehicleButton,
  VehicleCard,
  VehicleTextField,
} from "@/features/vehicles/components";
import { useTheme } from "@/providers/theme-provider";

/** Só a data, sem hora: extrato com hora em cada linha vira ruído. */
function comoDia(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR");
}

/** Mesmo recuo no cabeçalho e na folha, senão aparece uma fresta azul. */
const SOBREPOSICAO = 26;

/**
 * Carteira Rotta Pay do transportador.
 *
 * ## O que mudou em 16/10/2026, e por quê
 *
 * O fundador olhou esta tela depois do redesenho e disse que o app
 * estava "com cara de IA", e que era para ficar igual ao conceito que
 * ele tinha mandado. Ele estava certo. A causa não foi teimosia: as
 * duas imagens do conceito saíram do contexto da conversa numa
 * compactação, e o trabalho seguiu pela lembrança do que elas
 * mostravam.
 *
 * Com as imagens de volta e as cores amostradas pixel a pixel (ver
 * `providers/paleta-do-conceito.ts`), esta é a tela do telefone da
 * esquerda do conceito financeiro, montada como ele desenha:
 *
 * **O topo é azul e sangra até a barra de status.** Marca, perfil em
 * uso, sino e avatar em cima dele; a faixa de saldo em azul mais vivo
 * dentro dele; e a folha branca de conteúdo subindo por cima da faixa,
 * com os cantos arredondados. Antes era um cartão azul com margem dos
 * dois lados em cima de uma tela branca, que é o que qualquer template
 * faz.
 *
 * **O cabeçalho do app substitui o do navegador.** Por isso a rota
 * `Carteira` passou a `headerShown: false` em `VeiculoNavigator`, e a
 * volta virou a seta dentro do próprio cabeçalho azul: no conceito não
 * existe barra de navegação separada, e empilhar as duas daria dois
 * cabeçalhos na mesma tela.
 *
 * ## O que a tela continua não prometendo
 *
 * O conceito mostra Receber, Pix, Transferir, Pagar, Seguros, Cartão e
 * uma conta digital do Banco Rendimento. Desses, só o saque existe: os
 * outros dependem de instituição financeira parceira, e a conversa com
 * o Banco Rendimento segue sem resposta. Eles aparecem apagados, com o
 * motivo à mostra, em vez de sumir ou de abrir e dar erro.
 */
export function CarteiraScreen(): JSX.Element {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { user } = useAuth();
  const { data: wallet, isLoading, isError } = useMyWallet();
  const { data: transactionsResult } = useMyWalletTransactions();
  const { data: withdrawalRequests } = useMyWithdrawalRequests();
  const requestWithdrawal = useRequestWithdrawal();
  const { data: recebimento } = useContaDeRecebimento();
  const criarSubconta = useCriarSubconta();
  const conta = recebimento?.conta;
  /* Ativa, e não apenas criada: em análise o dinheiro ainda cai aqui. */
  const repasseDireto = conta?.status === "ATIVA" && Boolean(conta.lytexRecipientId);
  /* Sem subconta, e não sem linha no banco: a transportadora que só
     salvou a chave Pix tem conta de recebimento e não tem subconta, e é
     ela também que precisa do convite. */
  const semContaDeRecebimento = !conta?.lytexSubAccountId;

  const [showForm, setShowForm] = useState(false);
  /* Estado de sessão, e não preferência guardada: esconder o saldo é
     decisão do momento ("tem gente do meu lado agora"), não ajuste. */
  const [saldoVisivel, setSaldoVisivel] = useState(true);
  const [valor, setValor] = useState("");
  const [chavePix, setChavePix] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);

  async function handleSubmit(): Promise<void> {
    setFeedback(null);
    /* `reaisParaCentavos` e não `Number(valor.replace(",", "."))`:
       `replace` com string troca só a primeira ocorrência, e em notação
       brasileira o ponto é separador de milhar. Um saque de "1.234"
       virava 1,234 reais, e o motorista recebia R$ 1,23. */
    const valorCentavos = reaisParaCentavos(valor);
    if (valorCentavos === null || valorCentavos <= 0) {
      setFeedback("Informe um valor válido, como 1.234,56.");
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

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator color={theme.colors.primary} />
      </View>
    );
  }

  if (isError || !wallet) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <Texto style={{ color: theme.colors.danger }}>
          Não foi possível carregar sua carteira Rotta Pay.
        </Texto>
      </View>
    );
  }

  const transacoes = transactionsResult?.items ?? [];
  const saques = withdrawalRequests ?? [];

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: theme.colors.brandDeep }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {/* Sobre o azul profundo, os ícones escuros da barra de status
          somem. O app inteiro é claro, então a troca vale só aqui. */}
      <StatusBar style="light" />
      <ScrollView
        contentContainerStyle={styles.rolagem}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <AccountHeader
          titulo="Rotta"
          perfilAtivo="Transportadora"
          iniciais={user?.nome ? iniciaisDe(user.nome) : undefined}
          onAbrirPerfil={() => undefined}
          onVoltar={() => navigation.goBack()}
          rotuloDoSaldo="Saldo disponível"
          valorFormatado={formatarCentavos(wallet.saldoDisponivelCentavos)}
          visivel={saldoVisivel}
          onAlternarVisibilidade={() => setSaldoVisivel((v) => !v)}
          iconeMarca={<RottaLogo size={32} />}
          iconeVoltar={<ChevronLeft size={24} color={theme.colors.onPrimary} />}
          iconeSino={<Bell size={20} color={theme.colors.onPrimary} />}
          iconeTrocarPerfil={<ChevronDown size={14} color={theme.colors.onBrandMuted} />}
          iconeVisivel={<Eye size={16} color={theme.colors.onPrimary} />}
          iconeOculto={<EyeOff size={16} color={theme.colors.onPrimary} />}
          recuoDoTopo={insets.top}
          sobreposicaoDaFolha={SOBREPOSICAO}
          theme={theme}
        />

        <ContentSheet sobreposicao={SOBREPOSICAO} theme={theme}>
          {/*
            Quem ainda não tem conta de recebimento vê o convite ANTES
            dos atalhos do Rotta Pay. Não é preferência de layout: para
            essa pessoa, a mensalidade da família está caindo na conta da
            Rotta e virando saldo aqui, e abrir a conta é a coisa mais
            importante desta tela. Sacar vem depois.

            Com a conta aberta, o cartão desce para baixo dos atalhos
            (ver mais abaixo) e volta a ser o que é: estado, não convite.
          */}
          {semContaDeRecebimento ? (
            <ContaDeRecebimentoCard
              conta={conta}
              dadosParaAbrirConta={recebimento?.dadosParaAbrirConta}
              isAbrindoConta={criarSubconta.isPending}
              onAbrirConta={async (input) => {
                await criarSubconta.mutateAsync(input);
              }}
            />
          ) : null}

          <ActionGrid
            items={[
              {
                key: "saque",
                label: showForm ? "Cancelar" : "Sacar",
                icon: <ArrowDownToLine size={22} color={theme.colors.primary} />,
                onPress: () => setShowForm((v) => !v),
              },
              {
                key: "transferir",
                label: "Transferir",
                icon: <ArrowUpFromLine size={22} color={theme.colors.primary} />,
                onPress: () => undefined,
                motivoIndisponivel: "depende de parceiro bancário",
              },
              {
                key: "pagar",
                label: "Pagar",
                icon: <Receipt size={22} color={theme.colors.primary} />,
                onPress: () => undefined,
                motivoIndisponivel: "depende de parceiro bancário",
              },
              {
                key: "cartao",
                label: "Cartão",
                icon: <CreditCard size={22} color={theme.colors.primary} />,
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
              {feedback ? (
                <Texto style={{ color: theme.colors.textMuted, fontSize: 12 }}>{feedback}</Texto>
              ) : null}
              <VehicleButton
                label="Confirmar saque"
                onPress={() => void handleSubmit()}
                isLoading={requestWithdrawal.isPending}
              />
            </VehicleCard>
          ) : null}

          {/* Com a conta já aberta, o cartão é estado e mora aqui. O
              convite, para quem não tem, está acima dos atalhos. */}
          {semContaDeRecebimento ? null : (
            <ContaDeRecebimentoCard
              conta={conta}
              isAbrindoConta={criarSubconta.isPending}
              onAbrirConta={async (input) => {
                await criarSubconta.mutateAsync(input);
              }}
            />
          )}

          <VehicleCard>
            <Texto style={[styles.rotuloPendente, { color: theme.colors.textMuted }]}>
              A receber (pendente)
            </Texto>
            <Texto style={[styles.valorPendente, { color: theme.colors.text }]}>
              {formatarCentavos(wallet.saldoPendenteCentavos)}
            </Texto>
            {/* O texto muda com a conta de recebimento, porque o
                caminho do dinheiro muda: com ela ativa, a mensalidade
                não passa mais por aqui, e dizer que passa seria
                prometer um saldo que nunca vai aparecer. */}
            <Texto style={[styles.ajuda, { color: theme.colors.textMuted }]}>
              {repasseDireto
                ? "Mensalidades vão direto para a sua conta de recebimento e não entram aqui. O que estiver pendente é de antes dela."
                : "Mensalidades de contratos ativados ficam aqui até a confirmação de recebimento pela Rotta."}
            </Texto>
          </VehicleCard>

          <View>
            <SectionHeader title="Movimentações" theme={theme} />
            {transacoes.length === 0 ? (
              <EmptyState
                title="Nenhuma movimentação ainda"
                description="Mensalidades recebidas e saques aparecem aqui."
                icon={<Wallet size={28} color={theme.colors.primary} />}
                theme={theme}
              />
            ) : (
              <VehicleCard>
                {transacoes.map((transaction) => {
                  const credito = WALLET_IS_CREDITO[transaction.tipo];
                  return (
                    <MovementRow
                      key={transaction.id}
                      titulo={WALLET_TIPO_LABEL[transaction.tipo]}
                      subtitulo={WALLET_TRANSACTION_STATUS_LABEL[transaction.status]}
                      valorFormatado={formatarCentavos(transaction.valorCentavos)}
                      direcao={credito ? "entrada" : "saida"}
                      data={comoDia(transaction.createdAt)}
                      icon={
                        credito ? (
                          <ArrowDownToLine size={18} color={theme.colors.success} />
                        ) : (
                          <ArrowUpFromLine size={18} color={theme.colors.primary} />
                        )
                      }
                      theme={theme}
                    />
                  );
                })}
              </VehicleCard>
            )}
          </View>

          <View>
            <SectionHeader title="Saques solicitados" theme={theme} />
            {saques.length === 0 ? (
              <EmptyState
                title="Nenhum saque solicitado"
                description="O dinheiro disponível pode ser enviado para a sua chave Pix."
                icon={<ArrowDownToLine size={28} color={theme.colors.primary} />}
                theme={theme}
              />
            ) : (
              <VehicleCard>
                {saques.map((withdrawal, indice) => (
                  <View
                    key={withdrawal.id}
                    style={[
                      styles.saque,
                      indice === 0
                        ? null
                        : {
                            borderTopColor: theme.colors.hairline,
                            borderTopWidth: StyleSheet.hairlineWidth,
                          },
                    ]}
                  >
                    <View style={styles.saqueTexto}>
                      <Texto style={[styles.saqueValor, { color: theme.colors.text }]}>
                        {formatarCentavos(withdrawal.valorCentavos)}
                      </Texto>
                      <Texto style={{ color: theme.colors.textMuted, fontSize: 12 }}>
                        PIX: {withdrawal.chavePix}
                      </Texto>
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
        </ContentSheet>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  ajuda: { fontSize: 11, lineHeight: 16 },
  center: { alignItems: "center", flex: 1, justifyContent: "center", padding: 24 },
  flex: { flex: 1 },
  rolagem: { flexGrow: 1 },
  rotuloPendente: { fontSize: 11, fontWeight: "600" },
  saque: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
    paddingVertical: 10,
  },
  saqueTexto: { flex: 1, gap: 2, minWidth: 0 },
  saqueValor: { fontSize: 15, fontVariant: ["tabular-nums"], fontWeight: "700" },
  valorPendente: { fontSize: 20, fontVariant: ["tabular-nums"], fontWeight: "700" },
});
