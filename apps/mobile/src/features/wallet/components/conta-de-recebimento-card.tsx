import { formatarCentavos, reaisParaCentavos } from "@rotta/utils";
import { useState } from "react";
import { Linking, StyleSheet, View } from "react-native";

import type { CompanyPaymentAccount, CriarSubcontaAsaasInput } from "@rotta/api-client";

import { Texto } from "@/components/texto";
import {
  StatusPill,
  VehicleButton,
  VehicleCard,
  VehicleTextField,
  type StatusPillTone,
} from "@/features/vehicles/components";
import { useTheme } from "@/providers/theme-provider";

/**
 * Como a tela lê o estado da conta.
 *
 * O `status` do banco tem quatro valores, mas aqui são cinco situações:
 * falta "conta de recebimento existe, conta no provedor não", que é
 * onde está toda transportadora cadastrada antes de 20/10/2026.
 */
type Situacao = "SEM_SUBCONTA" | "EM_ANALISE" | "ATIVA" | "RECUSADA";

function situacaoDa(conta: CompanyPaymentAccount | null | undefined): Situacao {
  if (!conta?.asaasAccountId) return "SEM_SUBCONTA";
  if (conta.status === "ATIVA") return "ATIVA";
  if (conta.status === "RECUSADA") return "RECUSADA";
  return "EM_ANALISE";
}

const TOM: Record<Situacao, StatusPillTone> = {
  SEM_SUBCONTA: "neutral",
  EM_ANALISE: "warning",
  ATIVA: "success",
  RECUSADA: "danger",
};

const ROTULO: Record<Situacao, string> = {
  SEM_SUBCONTA: "Conta não aberta",
  EM_ANALISE: "Em análise",
  ATIVA: "Recebendo direto",
  RECUSADA: "Recusada",
};

/** Sempre responde onde o pagamento cai hoje, que é a pergunta real. */
const EXPLICACAO: Record<Situacao, string> = {
  SEM_SUBCONTA:
    "Hoje o pagamento da família cai na conta da Rotta e entra como saldo aqui no seu Rotta Pay, de onde você saca. Abrindo a sua conta de recebimento, ele passa a cair direto na sua.",
  EM_ANALISE:
    "A sua conta foi aberta e está em análise. Costuma levar até dois dias úteis, e você não precisa fazer nada: assim que for aprovada, esta tela muda sozinha. Até lá o pagamento continua caindo aqui.",
  ATIVA:
    "O pagamento da família cai direto na sua conta, sem passar pela Rotta. Você recebe a mensalidade menos a taxa do meio de pagamento e a nossa.",
  RECUSADA:
    "A análise não foi aprovada. Fale com a gente pelo suporte: na maioria dos casos é um dado do cadastro que precisa de ajuste, e não é preciso abrir conta nova.",
};

export interface ContaDeRecebimentoCardProps {
  conta: CompanyPaymentAccount | null | undefined;
  onAbrirConta: (input: CriarSubcontaAsaasInput) => Promise<void>;
  isAbrindoConta?: boolean;
}

/**
 * Abre e acompanha a conta de recebimento da transportadora, de dentro
 * do app.
 *
 * ## Por que um campo só
 *
 * Porque os outros a Rotta já tem: razão social, CNPJ, endereço e
 * contato vêm do cadastro, conferidos na Receita quando a
 * transportadora entrou. Num formulário de celular isso é a diferença
 * entre uma linha e doze.
 *
 * ## Por que o formulário desaparece depois
 *
 * Porque abrir a segunda conta perderia a primeira: a chave de acesso
 * só aparece na criação, e não há como pedir de novo. A API recusa, e a
 * tela não oferece.
 */
export function ContaDeRecebimentoCard({
  conta,
  onAbrirConta,
  isAbrindoConta = false,
}: ContaDeRecebimentoCardProps): JSX.Element {
  const { theme } = useTheme();
  const [faturamento, setFaturamento] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);

  const situacao = situacaoDa(conta);
  const centavos = reaisParaCentavos(faturamento);

  async function abrir(): Promise<void> {
    setFeedback(null);
    if (centavos === null || centavos <= 0) {
      setFeedback("Informe o faturamento mensal, por exemplo 4.500,00.");
      return;
    }
    try {
      await onAbrirConta({ faturamentoMensalCentavos: centavos });
      setFaturamento("");
    } catch {
      setFeedback("Não foi possível abrir a conta agora. Tente de novo.");
    }
  }

  return (
    <VehicleCard>
      <View style={styles.topo}>
        <Texto style={[styles.titulo, { color: theme.colors.text }]}>Conta de recebimento</Texto>
        <StatusPill label={ROTULO[situacao]} tone={TOM[situacao]} />
      </View>

      <Texto style={[styles.ajuda, { color: theme.colors.textMuted }]}>
        {EXPLICACAO[situacao]}
      </Texto>

      {situacao === "SEM_SUBCONTA" ? (
        <View style={styles.formulario}>
          <VehicleTextField
            label="Faturamento mensal"
            value={faturamento}
            onChangeText={setFaturamento}
            placeholder="4.500,00"
            keyboardType="decimal-pad"
          />
          <Texto style={[styles.ajuda, { color: theme.colors.textMuted }]}>
            {centavos !== null && centavos > 0
              ? `${formatarCentavos(centavos)} por mês`
              : "Quanto você recebe por mês, somando todas as famílias. É o único dado que ainda falta."}
          </Texto>
          {feedback ? (
            <Texto style={[styles.ajuda, { color: theme.colors.danger }]}>{feedback}</Texto>
          ) : null}
          <VehicleButton
            label="Abrir conta"
            onPress={() => void abrir()}
            isLoading={isAbrindoConta}
          />
        </View>
      ) : null}

      {/* O link só aparece quando o provedor manda um: inventar um
          endereço de envio de documento mandaria a pessoa para uma
          página que não existe. */}
      {conta?.asaasOnboardingUrl && situacao !== "ATIVA" ? (
        <VehicleButton
          label="Enviar os documentos"
          variant="secondary"
          onPress={() => void Linking.openURL(conta.asaasOnboardingUrl as string)}
        />
      ) : null}
    </VehicleCard>
  );
}

const styles = StyleSheet.create({
  ajuda: { fontSize: 12, lineHeight: 17 },
  formulario: { gap: 10, paddingTop: 4 },
  titulo: { flex: 1, fontSize: 15, fontWeight: "700" },
  topo: { alignItems: "center", flexDirection: "row", gap: 8 },
});
