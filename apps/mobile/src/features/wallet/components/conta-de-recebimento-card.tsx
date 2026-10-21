import { formatarCentavos, reaisParaCentavos } from "@rotta/utils";
import { useState } from "react";
import { Linking, StyleSheet, View } from "react-native";

import type {
  CompanyPaymentAccount,
  CriarSubcontaAsaasInput,
  DadosParaAbrirConta,
} from "@rotta/api-client";

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
  /**
   * O que a Rotta já tem para abrir a conta. Vai escrito na tela porque
   * o formulário pede um campo, e um formulário de um campo parece
   * incompleto se a pessoa não vê o resto indo.
   */
  dadosParaAbrirConta?: DadosParaAbrirConta;
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
  dadosParaAbrirConta,
  onAbrirConta,
  isAbrindoConta = false,
}: ContaDeRecebimentoCardProps): JSX.Element {
  const { theme } = useTheme();
  const [faturamento, setFaturamento] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);

  const situacao = situacaoDa(conta);
  const centavos = reaisParaCentavos(faturamento);
  const dados = dadosParaAbrirConta;
  const semConta = situacao === "SEM_SUBCONTA";

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

      {/* O que muda com a conta aberta, em três linhas. Vale só para
          quem ainda não tem: depois de aberta, isto é o presente, e
          descrever o presente como promessa é ruído. */}
      {semConta ? (
        <View style={styles.vantagens}>
          {[
            "A mensalidade da família cai direto na sua conta.",
            "Você continua acompanhando cada pagamento aqui no app.",
            "Para abrir, só falta um dado: o resto já está no seu cadastro.",
          ].map((linha) => (
            <View key={linha} style={styles.vantagem}>
              <View style={[styles.marcador, { backgroundColor: theme.colors.primary }]} />
              <Texto style={[styles.ajuda, styles.vantagemTexto, { color: theme.colors.text }]}>
                {linha}
              </Texto>
            </View>
          ))}
        </View>
      ) : null}

      {semConta ? (
        <View style={styles.formulario}>
          {/* Por que o formulário tem um campo: os outros já estão no
              cadastro da transportadora, e a pessoa confere aqui em vez
              de ter que confiar. Sem isto, um formulário de um campo
              parece um formulário incompleto. */}
          {dados ? (
            <View
              style={[
                styles.cadastro,
                {
                  backgroundColor: theme.colors.surfaceElevated,
                  borderColor: theme.colors.hairline,
                  borderRadius: theme.radius.md,
                },
              ]}
            >
              <Texto style={[styles.cadastroTitulo, { color: theme.colors.text }]}>
                O que vamos usar do seu cadastro
              </Texto>
              <DoCadastro rotulo="Titular" valor={dados.razaoSocial} />
              <DoCadastro
                rotulo={dados.tipoDePessoa === "FISICA" ? "CPF" : "CNPJ"}
                valor={dados.cpfCnpj}
              />
              <DoCadastro rotulo="E-mail" valor={dados.email} />
              <DoCadastro rotulo="Telefone" valor={dados.telefone} />
              <DoCadastro rotulo="Endereço" valor={`${dados.endereco} — ${dados.cep}`} />
              <Texto style={[styles.ajuda, { color: theme.colors.textMuted }]}>
                Está errado? Corrija no seu perfil antes de abrir a conta: depois de aberta, esses
                dados só mudam pelo provedor.
              </Texto>
            </View>
          ) : null}

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
          {/* Dito antes de a pessoa tocar no botão, e não depois: até o
              provedor liberar o cadastro dentro da Rotta, ele manda um
              e-mail próprio, e quem não foi avisado acha que é golpe. */}
          <Texto style={[styles.ajuda, { color: theme.colors.textMuted }]}>
            Você pode receber um e-mail do nosso provedor de pagamentos pedindo documento e selfie.
            É parte da abertura, e a análise costuma levar até dois dias úteis.
          </Texto>
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

/** Uma linha do cadastro: rótulo curto à esquerda, valor à direita. */
function DoCadastro({ rotulo, valor }: { rotulo: string; valor: string }): JSX.Element {
  const { theme } = useTheme();
  return (
    <View style={styles.linhaDoCadastro}>
      <Texto style={[styles.rotuloDoCadastro, { color: theme.colors.textMuted }]}>{rotulo}</Texto>
      <Texto style={[styles.valorDoCadastro, { color: theme.colors.text }]} numberOfLines={2}>
        {valor}
      </Texto>
    </View>
  );
}

const styles = StyleSheet.create({
  ajuda: { fontSize: 12, lineHeight: 17 },
  cadastro: { borderWidth: 1, gap: 6, padding: 12 },
  cadastroTitulo: { fontSize: 12, fontWeight: "700", marginBottom: 2 },
  formulario: { gap: 10, paddingTop: 4 },
  linhaDoCadastro: { flexDirection: "row", gap: 10 },
  marcador: { borderRadius: 3, height: 6, marginTop: 6, width: 6 },
  rotuloDoCadastro: { fontSize: 12, width: 76 },
  titulo: { flex: 1, fontSize: 15, fontWeight: "700" },
  topo: { alignItems: "center", flexDirection: "row", gap: 8 },
  valorDoCadastro: { flex: 1, fontSize: 12, fontWeight: "600" },
  vantagem: { flexDirection: "row", gap: 8 },
  vantagemTexto: { flex: 1 },
  vantagens: { gap: 6, paddingTop: 2 },
});
