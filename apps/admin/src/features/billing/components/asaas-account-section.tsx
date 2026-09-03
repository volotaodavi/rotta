"use client";

import { ApiError } from "@rotta/api-client";
import { ArrowDownRight, ArrowUpRight, Landmark, Send, Wallet } from "@rotta/icons";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Pagination,
  Select,
  Skeleton,
  StatTile,
  Table,
  TableSkeleton,
  Typography,
} from "@rotta/ui/web";
import { useState } from "react";

import type { BillingAdminStatementItem, PixKeyType } from "@rotta/api-client";
import type { TableColumn } from "@rotta/ui/web";

import {
  useBillingAdminBalance,
  useBillingAdminStatement,
  useCreateAdminTransfer,
} from "@/features/billing/hooks/use-billing";
import { usePrivacy } from "@/providers/privacy-provider";


const CAMPO_CLASSNAME =
  "h-11 w-full rounded-md border border-border bg-surface px-4 text-sm text-text placeholder:text-placeholder outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30";

const TIPO_CHAVE_LABEL: Record<PixKeyType, string> = {
  CPF: "CPF",
  CNPJ: "CNPJ",
  EMAIL: "E-mail",
  PHONE: "Telefone",
  EVP: "Chave aleatória",
};

function centsToBRL(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof ApiError ? error.message : fallback;
}

/**
 * Formulário de transferência Pix (Frente 33, pedido do usuário
 * 03/09/2026: "fazer transferências") — só renderizado pra
 * `AdminRottaPapel.GERAL` (ver `FinanceiroPage`, `podeTransferir`). O
 * backend já bloqueia o papel Financeiro via `AdminAreaGuard` (rota sem
 * `@AdminAreas` = GERAL-only por padrão) — esta checagem no front é só
 * pra nem mostrar o botão, nunca a única barreira real.
 *
 * Confirmação em duas etapas antes de disparar a mutação: dinheiro de
 * verdade saindo da conta da Rotta não deve sair de um clique só.
 */
function TransferForm(): JSX.Element {
  const [valor, setValor] = useState("");
  const [chavePix, setChavePix] = useState("");
  const [tipoChavePix, setTipoChavePix] = useState<PixKeyType>("EMAIL");
  const [descricao, setDescricao] = useState("");
  const [confirmando, setConfirmando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const createTransfer = useCreateAdminTransfer();

  const valorCentavos = Math.round(Number(valor.replace(",", ".")) * 100);
  const formularioValido =
    Number.isFinite(valorCentavos) && valorCentavos > 0 && chavePix.trim().length > 0;

  function handleIniciar(): void {
    setSuccess(null);
    if (!formularioValido) {
      setError("Informe um valor maior que zero e a chave Pix de destino.");
      return;
    }
    setError(null);
    setConfirmando(true);
  }

  function handleConfirmar(): void {
    createTransfer.mutate(
      { valorCentavos, chavePix: chavePix.trim(), tipoChavePix, descricao: descricao || undefined },
      {
        onSuccess: (transfer) => {
          setConfirmando(false);
          setValor("");
          setChavePix("");
          setDescricao("");
          setSuccess(
            `Transferência de ${centsToBRL(valorCentavos)} criada (status: ${transfer.status}). A confirmação final chega por webhook — pode levar alguns minutos.`,
          );
        },
        onError: (err) => {
          setConfirmando(false);
          setError(errorMessage(err, "Não foi possível criar a transferência. Tente novamente."));
        },
      },
    );
  }

  if (confirmando) {
    return (
      <div className="flex flex-col gap-3 rounded-lg border border-warning/40 bg-warning/5 p-4">
        <Typography variant="bodySmall" className="font-medium">
          Confirmar transferência de {centsToBRL(valorCentavos)} para a chave{" "}
          {TIPO_CHAVE_LABEL[tipoChavePix].toLowerCase()} <strong>{chavePix}</strong>?
        </Typography>
        <Typography variant="caption" color="muted">
          Essa ação move dinheiro de verdade pra fora da conta da Rotta e fica registrada na
          Auditoria.
        </Typography>
        <div className="flex gap-2">
          <Button
            variant="primary"
            size="sm"
            isLoading={createTransfer.isPending}
            onClick={handleConfirmar}
          >
            Confirmar e transferir
          </Button>
          <Button
            variant="secondary"
            size="sm"
            isDisabled={createTransfer.isPending}
            onClick={() => setConfirmando(false)}
          >
            Cancelar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-text" htmlFor="transfer-valor">
            Valor (R$)
          </label>
          <input
            id="transfer-valor"
            inputMode="decimal"
            value={valor}
            onChange={(event) => setValor(event.target.value.replace(/[^\d,.]/g, ""))}
            placeholder="0,00"
            className={CAMPO_CLASSNAME}
          />
        </div>
        <div className="flex flex-col gap-1 sm:col-span-2 lg:col-span-1">
          <label className="text-sm font-medium text-text" htmlFor="transfer-chave">
            Chave Pix de destino
          </label>
          <input
            id="transfer-chave"
            value={chavePix}
            onChange={(event) => setChavePix(event.target.value)}
            placeholder="e-mail, CPF/CNPJ, telefone..."
            className={CAMPO_CLASSNAME}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-text" htmlFor="transfer-tipo">
            Tipo de chave
          </label>
          <Select
            id="transfer-tipo"
            value={tipoChavePix}
            onChange={(event) => setTipoChavePix(event.target.value as PixKeyType)}
          >
            {(Object.keys(TIPO_CHAVE_LABEL) as PixKeyType[]).map((tipo) => (
              <option key={tipo} value={tipo}>
                {TIPO_CHAVE_LABEL[tipo]}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-text" htmlFor="transfer-descricao">
            Descrição (opcional)
          </label>
          <input
            id="transfer-descricao"
            value={descricao}
            onChange={(event) => setDescricao(event.target.value)}
            placeholder="Motivo da transferência"
            className={CAMPO_CLASSNAME}
          />
        </div>
      </div>

      {error && (
        <Typography variant="bodySmall" color="danger">
          {error}
        </Typography>
      )}
      {success && (
        <Typography variant="bodySmall" color="success">
          {success}
        </Typography>
      )}

      <div>
        <Button variant="primary" iconLeft={<Send className="h-4 w-4" />} onClick={handleIniciar}>
          Transferir
        </Button>
      </div>
    </div>
  );
}

function ExtratoTable(): JSX.Element {
  const [page, setPage] = useState(1);
  const { hidden } = usePrivacy();
  const { data, isLoading, isError } = useBillingAdminStatement(page, 20);

  const columns: TableColumn<BillingAdminStatementItem>[] = [
    {
      key: "data",
      header: "Data",
      render: (item) => new Date(item.data).toLocaleString("pt-BR"),
    },
    {
      key: "descricao",
      header: "Descrição",
      render: (item) => item.descricao ?? "-",
    },
    {
      key: "tipo",
      header: "Tipo",
      render: (item) => <Badge variant="neutral">{item.tipo}</Badge>,
    },
    {
      key: "valor",
      header: "Valor",
      render: (item) => (
        <span
          className={`flex items-center gap-1 font-medium ${item.valorCentavos >= 0 ? "text-success" : "text-danger"}`}
        >
          {item.valorCentavos >= 0 ? (
            <ArrowDownRight className="h-3.5 w-3.5" />
          ) : (
            <ArrowUpRight className="h-3.5 w-3.5" />
          )}
          {hidden ? "R$ ••••••" : centsToBRL(Math.abs(item.valorCentavos))}
        </span>
      ),
    },
    {
      key: "saldo",
      header: "Saldo após",
      render: (item) => (hidden ? "R$ ••••••" : centsToBRL(item.saldoAposCentavos)),
    },
  ];

  if (isLoading) {
    return <TableSkeleton rows={6} columns={5} />;
  }

  if (isError || !data?.configured) {
    return (
      <EmptyState
        icon={Landmark}
        title="Extrato indisponível"
        description="Não foi possível carregar o extrato da conta Asaas agora."
      />
    );
  }

  if (data.items.length === 0) {
    return (
      <EmptyState
        icon={Landmark}
        title="Nenhuma movimentação"
        description="Ainda não há lançamentos nesta conta."
      />
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <Table
        columns={columns}
        rows={data.items}
        keyExtractor={(item) =>
          `${item.data}-${item.tipo}-${item.valorCentavos}-${item.saldoAposCentavos}`
        }
      />
      <Pagination page={page} pageSize={20} total={data.total} onPageChange={setPage} />
    </div>
  );
}

/**
 * "Área financeira... transferências, extrato, saldo atual" (pedido do
 * usuário 03/09/2026) — conta Asaas de verdade da Rotta, diferente do
 * resto de `/financeiro` (que é sobre a mensalidade que a Rotta COBRA
 * das empresas). `podeTransferir` decide só se o FORMULÁRIO aparece —
 * o backend (`AdminAreaGuard`) é quem realmente barra o papel
 * Financeiro.
 */
export function AsaasAccountSection({ podeTransferir }: { podeTransferir: boolean }): JSX.Element {
  const { hidden } = usePrivacy();
  const { data: balance, isLoading: isLoadingBalance } = useBillingAdminBalance();

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Typography variant="title">Conta Asaas da Rotta</Typography>
        <Typography variant="bodySmall" color="muted">
          Saldo, extrato e transferências da conta real que recebe os pagamentos — diferente do
          resumo de mensalidade acima.
        </Typography>
      </div>

      {isLoadingBalance ? (
        <Skeleton variant="rect" height={80} className="max-w-xs" />
      ) : !balance?.configured ? (
        <Card>
          <Card.Body>
            <Badge variant="warning">Asaas não configurada</Badge>
          </Card.Body>
        </Card>
      ) : (
        <div className="max-w-xs">
          <StatTile
            icon={Wallet}
            label="Saldo atual"
            value={
              balance.saldoCentavos === null
                ? "-"
                : hidden
                  ? "R$ ••••••"
                  : centsToBRL(balance.saldoCentavos)
            }
          />
        </div>
      )}

      {balance?.configured && podeTransferir && (
        <Card>
          <Card.Header title="Nova transferência" />
          <Card.Body>
            <TransferForm />
          </Card.Body>
        </Card>
      )}

      {balance?.configured && (
        <Card>
          <Card.Header title="Extrato" />
          <Card.Body>
            <ExtratoTable />
          </Card.Body>
        </Card>
      )}
    </div>
  );
}
