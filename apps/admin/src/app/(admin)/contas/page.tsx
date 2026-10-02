"use client";

import { Badge, Button, Card, ErrorState, Input, Select, Spinner, Typography } from "@rotta/ui/web";
import Link from "next/link";
import { useState } from "react";

import type { ContaDaBusca } from "@rotta/api-client";

import {
  ExcluirDefinitivamenteDialog,
  type ExcluirDefinitivamenteDialogProps,
} from "@/features/account-deletion/components/excluir-definitivamente-dialog";
import {
  useAccountDeletionPreview,
  useContasParaExclusao,
  useDeleteAccount,
} from "@/features/account-deletion/hooks/use-account-deletion";

const STATUS_LABEL: Record<string, string> = {
  ATIVO: "Ativa",
  INATIVO: "Inativa",
  SUSPENSO: "Suspensa",
};

const VERIFICACAO_LABEL: Record<string, string> = {
  NAO_INICIADA: "Identidade não iniciada",
  EM_ANDAMENTO: "Identidade em andamento",
  EM_ANALISE: "Identidade em análise",
  APROVADA: "Identidade aprovada",
  REPROVADA: "Identidade reprovada",
  EXPIRADA: "Identidade expirada",
};

const FILTROS = [
  { value: "", label: "Todas as contas" },
  { value: "sem-empresa", label: "Cadastros não finalizados (sem empresa)" },
  { value: "SUSPENSO", label: "Contas suspensas" },
  { value: "ATIVO", label: "Contas ativas" },
] as const;

/**
 * Contas (Admin Rotta) — a lista de usuários que o painel nunca teve.
 *
 * Existe por causa do pedido de 02/10/2026: um botão para excluir
 * DEFINITIVAMENTE cadastros ativos, não finalizados e suspensos. Sem
 * uma lista de contas, um cadastro abandonado antes de entrar em
 * qualquer empresa era invisível no painel, e por isso impossível de
 * apagar — e como `email`/`telefone`/`cpf` são `@unique`, a pessoa
 * também não conseguia se cadastrar de novo.
 *
 * Contas de Admin Rotta não aparecem aqui: elas se gerenciam em
 * "Contas Admin", e a cadeia de autoria dos documentos legais depende
 * delas continuarem existindo.
 */
export default function ContasPage(): JSX.Element {
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState<string>("");
  const [contaSelecionada, setContaSelecionada] = useState<ContaDaBusca | null>(null);

  const contas = useContasParaExclusao({
    q: busca.trim() || undefined,
    semEmpresa: filtro === "sem-empresa" ? true : undefined,
    status: filtro === "ATIVO" || filtro === "SUSPENSO" ? filtro : undefined,
  });

  const preview = useAccountDeletionPreview(
    contaSelecionada?.userId ?? "",
    contaSelecionada !== null,
  );
  const excluir = useDeleteAccount();

  const dialogProps: ExcluirDefinitivamenteDialogProps | null = contaSelecionada && {
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

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <Typography variant="title">Contas</Typography>
        <Typography variant="bodySmall" color="muted">
          Toda conta de usuário da plataforma, com a exclusão definitiva. Para apagar uma
          transportadora inteira, use a ficha dela em Empresas.
        </Typography>
      </div>

      <Card>
        <Card.Body className="flex flex-col gap-3 sm:flex-row">
          <Input
            placeholder="Buscar por nome, e-mail, telefone ou CPF"
            value={busca}
            onChange={(event) => setBusca(event.target.value)}
          />
          <Select value={filtro} onChange={(event) => setFiltro(event.target.value)}>
            {FILTROS.map((opcao) => (
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
                <div className="flex flex-col gap-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Typography variant="body">{conta.nome}</Typography>
                    <Badge variant={conta.status === "ATIVO" ? "success" : "warning"}>
                      {STATUS_LABEL[conta.status] ?? conta.status}
                    </Badge>
                    {conta.vinculos.length === 0 ? (
                      <Badge variant="neutral">Sem empresa</Badge>
                    ) : null}
                  </div>
                  <Typography variant="caption" color="muted">
                    {conta.email} · {conta.telefone}
                    {conta.cpf ? ` · CPF ${conta.cpf}` : ""}
                  </Typography>
                  <Typography variant="caption" color="muted">
                    {VERIFICACAO_LABEL[conta.verificacaoIdentidade] ?? conta.verificacaoIdentidade}{" "}
                    · criada em {new Date(conta.criadaEm).toLocaleDateString("pt-BR")}
                  </Typography>
                  {conta.vinculos.length > 0 ? (
                    <Typography variant="caption" color="muted">
                      {conta.vinculos
                        .map((vinculo) => `${vinculo.role} em ${vinculo.nomeFantasia}`)
                        .join(" · ")}
                    </Typography>
                  ) : null}
                </div>
                <div className="flex gap-2">
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

      {dialogProps ? <ExcluirDefinitivamenteDialog {...dialogProps} /> : null}
    </div>
  );
}
