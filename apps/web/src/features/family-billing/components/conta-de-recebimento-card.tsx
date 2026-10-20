"use client";

import { Badge, Button, Card, FormField, Input, Typography } from "@rotta/ui/web";
import { formatarCentavos, reaisParaCentavos } from "@rotta/utils";
import { useState } from "react";

import type { CompanyPaymentAccount, CriarSubcontaAsaasInput } from "@rotta/api-client";

/**
 * Estado da conta de recebimento, escrito do ponto de vista de quem
 * espera o dinheiro.
 *
 * O `status` do banco tem quatro valores, mas a tela tem cinco
 * situações: falta a de "conta de recebimento existe, subconta não",
 * que é onde está toda transportadora cadastrada antes de 20/10/2026.
 * `PENDENTE` com `asaasAccountId` nulo é essa.
 */
type Situacao = "SEM_SUBCONTA" | "EM_ANALISE" | "ATIVA" | "RECUSADA";

function situacaoDa(conta: CompanyPaymentAccount | null | undefined): Situacao {
  if (!conta?.asaasAccountId) return "SEM_SUBCONTA";
  if (conta.status === "ATIVA") return "ATIVA";
  if (conta.status === "RECUSADA") return "RECUSADA";
  return "EM_ANALISE";
}

const TOM: Record<Situacao, "success" | "warning" | "danger" | "neutral"> = {
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

/**
 * O que está valendo hoje para o dinheiro desta transportadora. Diz
 * sempre onde o pagamento cai, porque é a pergunta que a pessoa tem.
 */
const EXPLICACAO: Record<Situacao, string> = {
  SEM_SUBCONTA:
    "Hoje o pagamento da família cai na conta da Rotta e entra como saldo no seu Rotta Pay, de onde você saca. Abrindo a sua conta de recebimento, ele passa a cair direto na sua.",
  EM_ANALISE:
    "A sua conta foi aberta e está em análise. Costuma levar até dois dias úteis, e você não precisa fazer nada: assim que for aprovada, esta tela muda sozinha. Até lá o pagamento continua caindo no seu Rotta Pay.",
  ATIVA:
    "O pagamento da família cai direto na sua conta, sem passar pela Rotta. Você recebe o valor da mensalidade menos a taxa do meio de pagamento e a nossa.",
  RECUSADA:
    "A análise não foi aprovada. Fale com a gente pelo suporte: na maioria dos casos é um dado do cadastro que precisa de ajuste, e não é preciso abrir conta nova.",
};

export interface ContaDeRecebimentoCardProps {
  conta: CompanyPaymentAccount | null | undefined;
  /** `true` enquanto o GET não respondeu: o cartão não oferece botão antes de saber o estado. */
  isLoading?: boolean;
  /**
   * Abre a conta. Rejeita quando não dá, e o cartão mostra o erro ao
   * lado do campo.
   *
   * O cartão não dispara aviso de canto nenhum: erro de preenchimento
   * pertence ao campo que o causou, e o aviso de sucesso é da página,
   * que é quem sabe o que mais aconteceu na tela.
   */
  onAbrirConta: (input: CriarSubcontaAsaasInput) => Promise<unknown>;
  isAbrindoConta?: boolean;
  /**
   * Quem está vendo. No painel do Admin o texto fala da transportadora
   * em terceira pessoa, e não "a sua conta".
   */
  nomeDaTransportadora?: string;
}

/**
 * Abre e acompanha a conta de recebimento da transportadora, sem ela
 * sair da Rotta.
 *
 * ## Por que um campo só
 *
 * Porque os outros a Rotta já tem: razão social, CNPJ, endereço e
 * contato vêm do cadastro, conferidos na Receita quando a
 * transportadora entrou. Pedir de novo seria pedir que ela digitasse o
 * próprio CNPJ para um sistema que acabou de mostrar o CNPJ dela.
 *
 * O faturamento mensal é o único que o provedor exige e que a Rotta
 * nunca coletou. É esse o formulário.
 *
 * ## Por que o botão desaparece depois
 *
 * Porque abrir a segunda conta perderia a primeira: a chave de acesso
 * só aparece no momento da criação, e não há como pedir de novo. A API
 * recusa, e a tela não oferece.
 */
export function ContaDeRecebimentoCard({
  conta,
  isLoading = false,
  onAbrirConta,
  isAbrindoConta = false,
  nomeDaTransportadora,
}: ContaDeRecebimentoCardProps): JSX.Element {
  const [faturamento, setFaturamento] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [erro, setErro] = useState<string | null>(null);

  const situacao = situacaoDa(conta);
  const centavos = reaisParaCentavos(faturamento);
  const titulo = nomeDaTransportadora
    ? `Conta de recebimento de ${nomeDaTransportadora}`
    : "A sua conta de recebimento";

  async function abrir(): Promise<void> {
    setErro(null);
    if (centavos === null || centavos <= 0) {
      setErro("Informe o faturamento mensal, por exemplo 4.500,00.");
      return;
    }
    try {
      await onAbrirConta({
        faturamentoMensalCentavos: centavos,
        email: email.trim() || undefined,
        telefone: telefone.replace(/\D/g, "") || undefined,
      });
      setFaturamento("");
      setEmail("");
      setTelefone("");
    } catch {
      setErro("Não foi possível abrir a conta agora. Tente de novo.");
    }
  }

  return (
    <Card>
      <Card.Header title={titulo} />
      <Card.Body className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Badge variant={TOM[situacao]}>{ROTULO[situacao]}</Badge>
          <Typography variant="bodySmall" color="muted">
            {EXPLICACAO[situacao]}
          </Typography>
        </div>

        {situacao === "SEM_SUBCONTA" && !isLoading && (
          <div className="flex flex-col gap-4 border-t border-border pt-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="flex-1">
                <FormField
                  label="Faturamento mensal"
                  helperText={
                    centavos !== null && centavos > 0
                      ? `${formatarCentavos(centavos)} por mês`
                      : "Quanto a transportadora recebe por mês, somando todas as famílias. É o único dado que ainda falta."
                  }
                  errorText={erro ?? undefined}
                  isRequired
                >
                  <Input
                    value={faturamento}
                    onChange={(event) => setFaturamento(event.target.value)}
                    placeholder="4.500,00"
                    inputMode="decimal"
                    hasError={Boolean(erro)}
                  />
                </FormField>
              </div>
              <Button onClick={() => void abrir()} isLoading={isAbrindoConta}>
                Abrir conta
              </Button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <FormField
                label="E-mail do financeiro"
                helperText="Em branco, vale o e-mail da transportadora."
              >
                <Input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="financeiro@exemplo.com.br"
                />
              </FormField>
              <FormField
                label="Celular do financeiro"
                helperText="Em branco, vale o telefone da transportadora."
              >
                <Input
                  value={telefone}
                  onChange={(event) => setTelefone(event.target.value)}
                  placeholder="(21) 99999-8888"
                  inputMode="tel"
                />
              </FormField>
            </div>
          </div>
        )}

        {/* O link só aparece quando o provedor manda um: inventar um
            endereço de upload de documento mandaria a pessoa para uma
            página que não existe. */}
        {conta?.asaasOnboardingUrl && situacao !== "ATIVA" && (
          <a
            href={conta.asaasOnboardingUrl}
            target="_blank"
            rel="noreferrer"
            className="text-sm font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
          >
            Enviar os documentos da conta
          </a>
        )}
      </Card.Body>
    </Card>
  );
}
