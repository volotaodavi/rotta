"use client";

import { ApiError } from "@rotta/api-client";
import {
  ArrowDownRight,
  ArrowUpRight,
  Landmark,
  ReceiptText,
  RefreshCw,
  Send,
  Wallet,
} from "@rotta/icons";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Pagination,
  Select,
  Skeleton,
  TrendAreaChart,
  Typography,
} from "@rotta/ui/web";
import { useMemo, useState } from "react";

import type { BillingAdminStatementItem, PixKeyType } from "@rotta/api-client";

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
 * Tradução dos tipos mais comuns do extrato da Asaas
 * (`docs.asaas.com` — `financialTransactions`) — nunca uma lista
 * fechada: tipo sem tradução aqui cai no fallback (`tipoLabel`) que só
 * troca "_" por espaço e capitaliza, nunca esconde um tipo novo que a
 * Asaas adicionar sem aviso.
 */
const TIPO_LABEL: Record<string, string> = {
  PAYMENT_RECEIVED: "Cobrança recebida",
  PAYMENT_CREDIT_CARD_FEE: "Taxa de cartão",
  PAYMENT_DUNNING_RECEIVED: "Cobrança de recuperação",
  ASAAS_FEE: "Taxa Asaas",
  TRANSFER: "Transferência",
  TRANSFER_FEE: "Taxa de transferência",
  PIX_TRANSACTION_FEE: "Taxa Pix",
  BOLETO_FEE: "Taxa de boleto",
  BANK_SLIP_FEE: "Taxa de boleto",
  PAYMENT_REFUND: "Estorno de cobrança",
  CHARGEBACK: "Contestação (chargeback)",
};

function tipoLabel(tipo: string): string {
  return (
    TIPO_LABEL[tipo] ??
    tipo
      .replaceAll("_", " ")
      .toLowerCase()
      .replace(/^./, (c) => c.toUpperCase())
  );
}

/** "Coloque também as taxas retidas pelo Asaas" (pedido do usuário 03/09/2026) — qualquer tipo com "FEE" no nome é uma taxa retida, sempre destacada em amarelo no extrato. */
function isTaxa(tipo: string): boolean {
  return tipo.includes("FEE");
}

const TONE_ICON_BG: Record<"success" | "warning" | "danger", string> = {
  success: "bg-success/15 text-success",
  warning: "bg-warning/15 text-warning",
  danger: "bg-danger/15 text-danger",
};

/**
 * Ícone + cor de cada lançamento do extrato — estilo "linha de banco"
 * (pedido do usuário 03/09/2026: "estilo banco mesmo", imagem de
 * referência com um ícone colorido por transação). Taxa (`isTaxa`)
 * sempre em amarelo com ícone de recibo, mesmo que o valor seja
 * negativo; entrada (valor ≥ 0) em verde com seta pra dentro; saída em
 * vermelho com seta pra fora.
 */
function iconeDoLancamento(item: BillingAdminStatementItem) {
  if (isTaxa(item.tipo)) {
    return { Icon: ReceiptText, tone: "warning" as const };
  }
  return item.valorCentavos >= 0
    ? { Icon: ArrowDownRight, tone: "success" as const }
    : { Icon: ArrowUpRight, tone: "danger" as const };
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

/** Uma linha do extrato — ícone colorido + descrição/tipo à esquerda, valor + saldo após à direita ("estilo banco mesmo", pedido do usuário 03/09/2026). */
function LinhaExtrato({
  item,
  hidden,
}: {
  item: BillingAdminStatementItem;
  hidden: boolean;
}): JSX.Element {
  const { Icon, tone } = iconeDoLancamento(item);
  const taxa = isTaxa(item.tipo);
  return (
    <div className="flex items-center gap-3 py-3">
      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${TONE_ICON_BG[tone]}`}
      >
        <Icon className="h-5 w-5" />
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <Typography variant="bodySmall" className="truncate font-medium">
          {item.descricao ?? tipoLabel(item.tipo)}
        </Typography>
        <div className="flex items-center gap-2">
          <Typography variant="caption" color="muted">
            {new Date(item.data).toLocaleString("pt-BR")}
          </Typography>
          {taxa && <Badge variant="warning">{tipoLabel(item.tipo)}</Badge>}
        </div>
      </div>
      <div className="flex shrink-0 flex-col items-end">
        <Typography
          variant="bodySmall"
          className={`font-semibold ${item.valorCentavos >= 0 ? "text-success" : "text-danger"}`}
        >
          {item.valorCentavos >= 0 ? "+" : "−"}
          {hidden ? "R$ ••••••" : centsToBRL(Math.abs(item.valorCentavos))}
        </Typography>
        <Typography variant="caption" color="muted">
          saldo {hidden ? "••••••" : centsToBRL(item.saldoAposCentavos)}
        </Typography>
      </div>
    </div>
  );
}

function ExtratoTable(): JSX.Element {
  const [page, setPage] = useState(1);
  const { hidden } = usePrivacy();
  const { data, isLoading, isError } = useBillingAdminStatement(page, 20);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-2">
        {Array.from({ length: 5 }).map((_, index) => (
          <Skeleton key={index} variant="rect" height={56} />
        ))}
      </div>
    );
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
        description="Ainda não há lançamentos nesta conta hoje."
      />
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col divide-y divide-border">
        {data.items.map((item) => (
          <LinhaExtrato
            key={`${item.data}-${item.tipo}-${item.valorCentavos}-${item.saldoAposCentavos}`}
            item={item}
            hidden={hidden}
          />
        ))}
      </div>
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
/** Rola suavemente até uma seção da própria página (âncoras reais — "Nova transferência"/"Ver extrato" no card de saldo levam pros cards de verdade logo abaixo, nunca um botão decorativo). */
function irParaSecao(id: string): void {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

export function AsaasAccountSection({ podeTransferir }: { podeTransferir: boolean }): JSX.Element {
  const { hidden } = usePrivacy();
  const {
    data: balance,
    isLoading: isLoadingBalance,
    isFetching: isFetchingBalance,
    dataUpdatedAt,
    refetch: refetchBalance,
  } = useBillingAdminBalance();
  // Primeira página do extrato já carrega aqui também (mesma queryKey da
  // `ExtratoTable`, cache do React Query compartilhado — sem 2ª chamada) só
  // pra desenhar a curva do saldo do card de destaque com PONTO REAL de
  // cada lançamento (`saldoAposCentavos`), nunca uma série inventada.
  const { data: statement } = useBillingAdminStatement(1, 20);

  const pontosSaldo = useMemo(() => {
    if (!statement?.configured) return [];
    return [...statement.items]
      .sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime())
      .map((item) => ({
        label: new Date(item.data).toLocaleTimeString("pt-BR", {
          hour: "2-digit",
          minute: "2-digit",
        }),
        value: item.saldoAposCentavos / 100,
      }));
  }, [statement]);

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
        <Skeleton variant="rect" height={180} />
      ) : !balance?.configured ? (
        <Card>
          <Card.Body>
            <Badge variant="warning">Asaas não configurada</Badge>
          </Card.Body>
        </Card>
      ) : (
        <Card>
          <Card.Body className="flex flex-col gap-4">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Wallet className="h-7 w-7" />
                </div>
                <div className="flex flex-col gap-0.5">
                  <Typography variant="caption" color="muted">
                    Saldo atual da conta
                  </Typography>
                  <Typography variant="display">
                    {balance.saldoCentavos === null
                      ? "-"
                      : hidden
                        ? "R$ ••••••"
                        : centsToBRL(balance.saldoCentavos)}
                  </Typography>
                  <Typography variant="caption" color="muted">
                    {isFetchingBalance
                      ? "Atualizando..."
                      : dataUpdatedAt
                        ? `Atualizado às ${new Date(dataUpdatedAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`
                        : ""}
                  </Typography>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {podeTransferir && (
                  <Button
                    variant="secondary"
                    size="sm"
                    iconLeft={<Send className="h-4 w-4" />}
                    onClick={() => irParaSecao("transferencia-pix")}
                  >
                    Nova transferência
                  </Button>
                )}
                <Button
                  variant="secondary"
                  size="sm"
                  iconLeft={<ReceiptText className="h-4 w-4" />}
                  onClick={() => irParaSecao("extrato-asaas")}
                >
                  Ver extrato
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  iconLeft={<RefreshCw className="h-4 w-4" />}
                  isDisabled={isFetchingBalance}
                  onClick={() => void refetchBalance()}
                >
                  Atualizar
                </Button>
              </div>
            </div>

            {hidden ? null : pontosSaldo.length >= 2 ? (
              <TrendAreaChart
                data={pontosSaldo}
                height={72}
                seriesName="Saldo"
                valueFormatter={(value) => centsToBRL(Math.round(value * 100))}
              />
            ) : (
              <Typography variant="caption" color="muted">
                Poucos lançamentos hoje pra desenhar a curva do saldo — ela aparece assim que houver
                2 ou mais.
              </Typography>
            )}
          </Card.Body>
        </Card>
      )}

      {balance?.configured && podeTransferir && (
        <Card id="transferencia-pix">
          <Card.Header title="Nova transferência" />
          <Card.Body>
            <TransferForm />
          </Card.Body>
        </Card>
      )}

      {balance?.configured && (
        <Card id="extrato-asaas">
          <Card.Header title="Extrato" action={<Badge variant="neutral">Desde hoje</Badge>} />
          <Card.Body>
            <ExtratoTable />
          </Card.Body>
        </Card>
      )}
    </div>
  );
}
