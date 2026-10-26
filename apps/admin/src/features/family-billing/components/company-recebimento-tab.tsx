"use client";

import {
  Badge,
  Button,
  Card,
  FormField,
  Input,
  Spinner,
  Typography,
  useToast,
} from "@rotta/ui/web";
import { formatarCentavos, reaisParaCentavos } from "@rotta/utils";
import { useState } from "react";

import type { CompanyPaymentAccount } from "@rotta/api-client";

import {
  useContaDeRecebimentoDaEmpresa,
  useCriarSubcontaDaEmpresa,
} from "@/features/family-billing/hooks/use-conta-de-recebimento";

/**
 * O `status` do banco tem quatro valores; a tela tem cinco situações.
 * Falta a de "conta de recebimento existe, subconta não", que é onde
 * está toda transportadora cadastrada antes de 20/10/2026.
 */
type Situacao = "SEM_SUBCONTA" | "EM_ANALISE" | "ATIVA" | "RECUSADA";

function situacaoDa(conta: CompanyPaymentAccount | null | undefined): Situacao {
  if (!conta?.lytexSubAccountId) return "SEM_SUBCONTA";
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
  SEM_SUBCONTA: "Sem subconta",
  EM_ANALISE: "Em análise",
  ATIVA: "Ativa",
  RECUSADA: "Recusada",
};

/** Onde o dinheiro cai hoje, escrito para quem decide, não para quem espera. */
const CAMINHO_DO_DINHEIRO: Record<Situacao, string> = {
  SEM_SUBCONTA:
    "A mensalidade cai na conta da Rotta e vira saldo no Rotta Pay desta transportadora, que ela saca. Nenhum split acontece.",
  EM_ANALISE:
    "A subconta existe mas ainda não foi aprovada. Até a aprovação, a mensalidade continua caindo na conta da Rotta. O estado muda sozinho pelo webhook de situação da conta.",
  ATIVA: "A mensalidade vai direto para a subconta, com a taxa da Rotta retida no split.",
  RECUSADA:
    "A análise foi recusada pelo provedor. Normalmente é dado de cadastro: corrigir o cadastro e falar com o suporte do provedor, sem criar subconta nova.",
};

/** Pontos-base para porcentagem legível: 129 vira "1,29%". */
function comoPercentual(bps: number): string {
  return `${(bps / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}%`;
}

/**
 * A conta de recebimento de uma transportadora, pelo painel do Admin
 * Rotta.
 *
 * ## Para que serve, de verdade
 *
 * Para o fundador abrir a conta PELA transportadora quando ela pede
 * ajuda, e para conferir, numa tela, por onde o dinheiro dela está
 * passando hoje. Foi pedido nesses termos em 20/10/2026: "consigo fazer
 * isso dentro do painel do admin como admin master?".
 *
 * ## O que esta tela nunca mostra
 *
 * A chave de API da subconta. A resposta da API traz
 * `podeEmitirPelaSubconta`, um booleano, e nada mais — nem no painel do
 * fundador. O compromisso assumido quando guardar chave de terceiro foi
 * autorizado foi "nunca em log nem em resposta de API", e painel de
 * admin é resposta de API como qualquer outra.
 *
 * ## O que ela ainda não faz, e por quê
 *
 * Ligar a custódia e mexer nas taxas. As duas coisas são decisão do
 * fundador uma transportadora por vez, e a custódia depende do white
 * label, que segue com o comercial do provedor. Enquanto isso, os
 * valores aparecem como estão, em vez de um controle que escreveria algo
 * que ninguém decidiu.
 */
export function CompanyRecebimentoTab({ companyId }: { companyId: string }): JSX.Element {
  const toast = useToast();
  const { data: recebimento, isLoading } = useContaDeRecebimentoDaEmpresa(companyId);
  const criar = useCriarSubcontaDaEmpresa(companyId);
  const [faturamento, setFaturamento] = useState("");
  const [erro, setErro] = useState<string | null>(null);

  const conta = recebimento?.conta;
  const dados = recebimento?.dadosParaAbrirConta;
  const situacao = situacaoDa(conta);
  const centavos = reaisParaCentavos(faturamento);

  function abrir(): void {
    setErro(null);
    if (centavos === null || centavos <= 0) {
      setErro("Informe o faturamento mensal da transportadora, por exemplo 4.500,00.");
      return;
    }
    criar.mutate(
      { faturamentoMensalCentavos: centavos },
      {
        onSuccess: () => {
          setFaturamento("");
          toast.success("Subconta criada. O provedor analisa em até dois dias úteis.");
        },
        onError: () => setErro("O provedor não aceitou a criação. Confira os dados do cadastro."),
      },
    );
  }

  if (isLoading) {
    return (
      <Card>
        <Card.Body className="flex justify-center py-8">
          <Spinner />
        </Card.Body>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <Card.Header
          title="Conta de recebimento"
          action={<Badge variant={TOM[situacao]}>{ROTULO[situacao]}</Badge>}
        />
        <Card.Body className="flex flex-col gap-4">
          <Typography variant="bodySmall" color="muted">
            {CAMINHO_DO_DINHEIRO[situacao]}
          </Typography>

          {/* O que vai ser enviado, escrito. No painel do Admin isto
              vale ainda mais que na tela da transportadora: quem cria
              pelo cliente precisa ver o cadastro que vai assinar a
              conta antes de criar, porque depois disso o nome e o
              documento só mudam pelo provedor. */}
          {situacao === "SEM_SUBCONTA" && dados ? (
            <dl className="grid gap-x-6 gap-y-1.5 rounded-md bg-muted/60 p-4 sm:grid-cols-2">
              <Dado rotulo="Titular (razão social)" valor={dados.razaoSocial} />
              <Dado
                rotulo={dados.tipoDePessoa === "FISICA" ? "CPF (autônomo)" : "CNPJ"}
                valor={dados.cpfCnpj}
              />
              <Dado rotulo="E-mail" valor={dados.email} />
              <Dado rotulo="Telefone" valor={dados.telefone} />
              <Dado rotulo="Endereço" valor={`${dados.endereco} — ${dados.cep}`} />
              <Dado rotulo="Ainda falta" valor={dados.faltando.join(", ")} />
            </dl>
          ) : null}

          {situacao === "SEM_SUBCONTA" ? (
            <div className="flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-end">
              <div className="flex-1">
                <FormField
                  label="Faturamento mensal"
                  helperText={
                    centavos !== null && centavos > 0
                      ? `${formatarCentavos(centavos)} por mês`
                      : "O único dado que o provedor exige e que a Rotta não tem. O resto sai do cadastro da transportadora."
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
              <Button onClick={abrir} isLoading={criar.isPending}>
                Criar subconta
              </Button>
            </div>
          ) : null}

          {situacao === "EM_ANALISE" ? (
            <p className="text-sm text-muted">
              A Lytex ainda está analisando esta conta. O envio de documentos acontece no
              atendimento deles, e não há link para abrir por aqui: a API da Lytex não publica um.
              Assim que o split for liberado, esta tela muda sozinha.
            </p>
          ) : null}
        </Card.Body>
      </Card>

      {conta ? (
        <Card>
          <Card.Header title="Como esta transportadora recebe" />
          <Card.Body className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Dado
              rotulo="Emissor da cobrança"
              valor={conta.emissorDaCobranca === "SUBCONTA" ? "A subconta" : "A Rotta"}
            />
            <Dado
              rotulo="Custódia"
              valor={
                conta.custodiaAtiva
                  ? `Ativa, libera em ${conta.custodiaDiasParaLiberar ?? "?"} dias`
                  : "Desligada"
              }
            />
            <Dado
              rotulo="Pode emitir pela subconta"
              valor={conta.podeEmitirPelaSubconta ? "Sim, o split está liberado" : "Não"}
            />
            <Dado rotulo="Chave Pix de saque" valor={conta.chavePix ?? "Não informada"} />
            <Dado rotulo="id da subconta na Lytex" valor={conta.lytexSubAccountId ?? "—"} />
            <Dado rotulo="estabelecimento do split" valor={conta.lytexRecipientId ?? "—"} />
          </Card.Body>
        </Card>
      ) : null}

      {conta ? (
        <Card>
          <Card.Header title="Taxa da Rotta, por meio de pagamento" />
          <Card.Body className="flex flex-col gap-4">
            {/* Zero não é um defeito: é o combinado de hoje. A Rotta
                ganha na assinatura da plataforma, e a taxa por meio só
                é ligada por decisão do fundador, uma transportadora
                por vez. */}
            <Typography variant="bodySmall" color="muted">
              Em zero, a mensalidade vai inteira para a transportadora. Ligar a taxa é decisão de
              negócio, uma transportadora por vez, e ainda não se faz por esta tela.
            </Typography>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <Dado rotulo="Pix" valor={comoPercentual(conta.taxaPixBps)} />
              <Dado rotulo="Boleto" valor={comoPercentual(conta.taxaBoletoBps)} />
              <Dado rotulo="Crédito à vista" valor={comoPercentual(conta.taxaCreditoVistaBps)} />
              <Dado
                rotulo="Crédito parcelado"
                valor={comoPercentual(conta.taxaCreditoParceladoBps)}
              />
            </div>
          </Card.Body>
        </Card>
      ) : null}
    </div>
  );
}

function Dado({ rotulo, valor }: { rotulo: string; valor: string }): JSX.Element {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <Typography variant="caption" color="muted">
        {rotulo}
      </Typography>
      <Typography variant="body" className="break-words">
        {valor}
      </Typography>
    </div>
  );
}
