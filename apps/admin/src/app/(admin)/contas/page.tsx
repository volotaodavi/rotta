"use client";

import { Badge, Button, Card, ErrorState, Input, Select, Spinner, Typography } from "@rotta/ui/web";
import Link from "next/link";
import { useState } from "react";

import type { ContaDaBusca, PreCadastroDaBusca, RecorteDeContas } from "@rotta/api-client";

import {
  ExcluirDefinitivamenteDialog,
  type ExcluirDefinitivamenteDialogProps,
} from "@/features/account-deletion/components/excluir-definitivamente-dialog";
import {
  useAccountDeletionPreview,
  useContasParaExclusao,
  useDeleteAccount,
  useDeletePreCadastro,
  usePreCadastros,
} from "@/features/account-deletion/hooks/use-account-deletion";
import { useBuscaAdiada } from "@/hooks/use-busca-adiada";

const STATUS_LABEL: Record<string, string> = {
  ATIVO: "Ativa",
  INATIVO: "Desativada",
};

const TIPO_LABEL: Record<ContaDaBusca["tipo"], string> = {
  transportadora: "Transportadora",
  transportador: "Motorista/monitor",
  responsavel: "Responsável",
  escola: "Escola",
  indefinido: "Sem papel",
};

const VERIFICACAO_LABEL: Record<string, string> = {
  NAO_INICIADA: "Identidade não iniciada",
  EM_ANDAMENTO: "Identidade em andamento",
  EM_ANALISE: "Identidade em análise",
  APROVADA: "Identidade aprovada",
  REPROVADA: "Identidade reprovada",
  EXPIRADA: "Identidade expirada",
};

const RECORTES: Array<{ value: "" | RecorteDeContas; label: string }> = [
  { value: "", label: "Todas as contas" },
  { value: "com-pendencia", label: "Com alguma pendência" },
  { value: "sem-transportadora", label: "Motorista/monitor sem transportadora" },
  { value: "responsavel-sem-aluno", label: "Responsável sem aluno cadastrado" },
  { value: "identidade-pendente", label: "Identidade não aprovada" },
  { value: "desativadas", label: "Contas desativadas" },
];

const STATUS_PRE_CADASTRO_LABEL: Record<string, string> = {
  PENDENTE: "Aguardando pagamento",
  PAGO: "Pago",
  VINCULADO: "Virou transportadora",
  EXPIRADO: "Expirado",
  REEMBOLSADO: "Reembolsado",
};

function formatarReais(centavos: number): string {
  return (centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatarData(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR");
}

/** As pendências de uma linha, do jeito que o admin precisa ler: curtas e enumeradas. */
function Pendencias({ itens }: { itens: string[] }): JSX.Element | null {
  if (itens.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {itens.map((item) => (
        <Badge key={item} variant="warning">
          {item}
        </Badge>
      ))}
    </div>
  );
}

/**
 * Contas (Admin Rotta) — a lista de usuários que o painel nunca teve,
 * agora dizendo o que falta em cada cadastro.
 *
 * Nasceu em 02/10/2026 com a exclusão definitiva: sem uma lista de
 * contas, um cadastro abandonado antes de entrar em qualquer empresa
 * era invisível no painel e por isso impossível de apagar, enquanto
 * `email`/`telefone`/`cpf` (todos `@unique`) seguiam bloqueando um
 * cadastro novo da mesma pessoa.
 *
 * Ganhou o "o que falta" no mesmo dia, pelo pedido seguinte ("mostre
 * os cadastros não contemplados também, pq aí vou saber quais são as
 * questões faltantes"), que expôs três defeitos da primeira versão:
 *
 * 1. "Sem empresa" era tratado como cadastro não finalizado, e um
 *    Responsável NUNCA tem empresa (ver `AuthService.registerPessoal`).
 *    A lista chamava toda família de cadastro incompleto. Agora cada
 *    linha tem `tipo`, e o que falta é a regra daquele tipo.
 * 2. O filtro "Contas suspensas" nunca casava nada: `UserStatus` só
 *    tem ATIVO e INATIVO, SUSPENSO é de `Company`.
 * 3. Os pré-cadastros (`PendingSubscription`) não apareciam em tela
 *    nenhuma do painel — inclusive os PAGOS, gente que colocou dinheiro
 *    e nunca completou o cadastro. Estão na segunda seção.
 *
 * Contas de Admin Rotta não aparecem aqui: elas se gerenciam em
 * "Contas Admin", e a cadeia de autoria dos documentos legais depende
 * de elas continuarem existindo.
 */
export default function ContasPage(): JSX.Element {
  const [busca, setBusca] = useState("");
  const buscaAdiada = useBuscaAdiada(busca);
  const [recorte, setRecorte] = useState<"" | RecorteDeContas>("");
  const [contaSelecionada, setContaSelecionada] = useState<ContaDaBusca | null>(null);
  const [preSelecionado, setPreSelecionado] = useState<PreCadastroDaBusca | null>(null);

  const termo = buscaAdiada.trim() || undefined;
  const contas = useContasParaExclusao({ q: termo, recorte: recorte || undefined });
  const preCadastros = usePreCadastros({ q: termo });

  const preview = useAccountDeletionPreview(
    contaSelecionada?.userId ?? "",
    contaSelecionada !== null,
  );
  const excluir = useDeleteAccount();
  const excluirPre = useDeletePreCadastro();

  const dialogConta: ExcluirDefinitivamenteDialogProps | null = contaSelecionada && {
    isOpen: true,
    onClose: () => {
      setContaSelecionada(null);
      excluir.reset();
    },
    titulo: "Excluir conta definitivamente",
    confirmacaoEsperada: contaSelecionada.email,
    isLoadingPreview: preview.isLoading,
    podeExcluir: preview.data ? preview.data.podeExcluir : null,
    impedimentos: preview.data?.impedimentos ?? [],
    seraApagado: preview.data?.seraApagado ?? [],
    isExcluindo: excluir.isPending,
    erro: excluir.error,
    onConfirmar: () =>
      excluir.mutate(contaSelecionada.userId, {
        onSuccess: () => {
          setContaSelecionada(null);
          void contas.refetch();
        },
      }),
  };

  const dialogPre: ExcluirDefinitivamenteDialogProps | null = preSelecionado && {
    isOpen: true,
    onClose: () => {
      setPreSelecionado(null);
      excluirPre.reset();
    },
    titulo: "Excluir pré-cadastro",
    aviso:
      "Isto apaga o pré-cadastro do banco e não tem como desfazer. Nenhuma conta é afetada, porque nunca houve conta.",
    confirmacaoEsperada: preSelecionado.email ?? preSelecionado.nome,
    isLoadingPreview: false,
    podeExcluir: preSelecionado.podeExcluir,
    impedimentos: preSelecionado.podeExcluir
      ? []
      : [
          {
            o_que:
              "pagamento confirmado neste pré-cadastro. É registro fiscal: ele é anonimizado junto da exclusão da transportadora, nunca apagado",
            quantos: 1,
          },
        ],
    seraApagado: [{ o_que: "pré-cadastro, sem conta nem transportadora ligada", quantos: 1 }],
    isExcluindo: excluirPre.isPending,
    erro: excluirPre.error,
    onConfirmar: () =>
      excluirPre.mutate(preSelecionado.id, {
        onSuccess: () => setPreSelecionado(null),
      }),
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <Typography variant="title">Contas</Typography>
        <Typography variant="bodySmall" color="muted">
          Toda conta de usuário da plataforma, o que falta em cada uma e a exclusão definitiva. Para
          apagar uma transportadora inteira, use a ficha dela em Empresas.
        </Typography>
      </div>

      <Card>
        <Card.Body className="flex flex-col gap-3 sm:flex-row">
          <Input
            placeholder="Buscar por nome, e-mail, telefone ou CPF"
            value={busca}
            onChange={(event) => setBusca(event.target.value)}
          />
          <Select
            value={recorte}
            onChange={(event) => setRecorte(event.target.value as "" | RecorteDeContas)}
          >
            {RECORTES.map((opcao) => (
              <option key={opcao.value} value={opcao.value}>
                {opcao.label}
              </option>
            ))}
          </Select>
        </Card.Body>
      </Card>

      {contas.isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : contas.isError || !contas.data ? (
        <Card>
          <Card.Body>
            <ErrorState
              message="Não foi possível carregar as contas."
              onRetry={() => void contas.refetch()}
            />
          </Card.Body>
        </Card>
      ) : contas.data.items.length === 0 ? (
        <Card>
          <Card.Body>
            <Typography variant="body" color="muted">
              Nenhuma conta encontrada com esse filtro.
            </Typography>
          </Card.Body>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          <Typography variant="caption" color="muted">
            {contas.data.items.length} de {contas.data.total} contas
          </Typography>
          {contas.data.items.map((conta) => (
            <Card key={conta.userId}>
              <Card.Body className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-col gap-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <Typography variant="body">{conta.nome}</Typography>
                    <Badge variant="neutral">{TIPO_LABEL[conta.tipo]}</Badge>
                    {conta.status === "ATIVO" ? null : (
                      <Badge variant="warning">{STATUS_LABEL[conta.status] ?? conta.status}</Badge>
                    )}
                  </div>
                  <Pendencias itens={conta.pendencias} />
                  <Typography variant="caption" color="muted">
                    {conta.email} · {conta.telefone}
                    {conta.cpf ? ` · CPF ${conta.cpf}` : ""}
                  </Typography>
                  <Typography variant="caption" color="muted">
                    {conta.tipo === "responsavel" || conta.tipo === "escola"
                      ? "Identidade não exigida neste tipo de conta"
                      : (VERIFICACAO_LABEL[conta.verificacaoIdentidade] ??
                        conta.verificacaoIdentidade)}{" "}
                    · criada em {formatarData(conta.criadaEm)}
                  </Typography>
                  {conta.vinculos.length > 0 ? (
                    <Typography variant="caption" color="muted">
                      {conta.vinculos
                        .map((vinculo) => `${vinculo.role} em ${vinculo.nomeFantasia}`)
                        .join(" · ")}
                    </Typography>
                  ) : null}
                </div>
                <div className="flex shrink-0 gap-2">
                  {conta.vinculos[0] ? (
                    <Link href={`/empresas/${conta.vinculos[0].companyId}`}>
                      <Button variant="secondary">Ver empresa</Button>
                    </Link>
                  ) : null}
                  <Button variant="danger" onClick={() => setContaSelecionada(conta)}>
                    Excluir
                  </Button>
                </div>
              </Card.Body>
            </Card>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-1 pt-2">
        <Typography variant="subtitle">Pré-cadastros que nunca viraram conta</Typography>
        <Typography variant="bodySmall" color="muted">
          Checkout da assinatura iniciado no site, sem conta nem transportadora no fim. Quem pagou e
          não completou aparece aqui, e o pré-cadastro com pagamento não se apaga: ele é o registro
          fiscal da cobrança.
        </Typography>
      </div>

      {preCadastros.isLoading ? (
        <div className="flex justify-center py-8">
          <Spinner size="md" />
        </div>
      ) : preCadastros.isError || !preCadastros.data ? (
        <Card>
          <Card.Body>
            <ErrorState
              message="Não foi possível carregar os pré-cadastros."
              onRetry={() => void preCadastros.refetch()}
            />
          </Card.Body>
        </Card>
      ) : preCadastros.data.items.length === 0 ? (
        <Card>
          <Card.Body>
            <Typography variant="body" color="muted">
              Nenhum pré-cadastro em aberto.
            </Typography>
          </Card.Body>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          <Typography variant="caption" color="muted">
            {preCadastros.data.items.length} de {preCadastros.data.total} pré-cadastros
          </Typography>
          {preCadastros.data.items.map((pre) => (
            <Card key={pre.id}>
              <Card.Body className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-col gap-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <Typography variant="body">{pre.nome}</Typography>
                    <Badge variant={pre.pagoEm ? "success" : "neutral"}>
                      {STATUS_PRE_CADASTRO_LABEL[pre.status] ?? pre.status}
                    </Badge>
                  </div>
                  <Pendencias itens={pre.pendencias} />
                  <Typography variant="caption" color="muted">
                    {pre.email ?? "sem e-mail"} · {pre.telefone ?? "sem telefone"}
                    {pre.cpfCnpj ? ` · ${pre.cpfCnpj}` : ""}
                  </Typography>
                  <Typography variant="caption" color="muted">
                    {pre.planCode} · {formatarReais(pre.valorCentavos)} · {pre.provider} · criado em{" "}
                    {formatarData(pre.criadoEm)}
                    {pre.pagoEm ? ` · pago em ${formatarData(pre.pagoEm)}` : ""}
                  </Typography>
                </div>
                {/*
                  O botão NÃO fica desabilitado quando o pré-cadastro é
                  fiscal: quem clica merece ler o motivo, e é o diálogo
                  que o diz (um botão cinza sem explicação só gera a
                  pergunta "por que não posso?").
                */}
                <div className="flex shrink-0 gap-2">
                  <Button variant="danger" onClick={() => setPreSelecionado(pre)}>
                    Excluir
                  </Button>
                </div>
              </Card.Body>
            </Card>
          ))}
        </div>
      )}

      {dialogConta ? <ExcluirDefinitivamenteDialog {...dialogConta} /> : null}
      {dialogPre ? <ExcluirDefinitivamenteDialog {...dialogPre} /> : null}
    </div>
  );
}
