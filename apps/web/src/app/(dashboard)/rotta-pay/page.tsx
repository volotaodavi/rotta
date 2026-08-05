"use client";

import { ApiError } from "@rotta/api-client";
import {
  ArrowDownToLine,
  CheckCircle2,
  Clock3,
  CreditCard,
  Landmark,
  RefreshCw,
  Wallet as WalletIcon,
  XCircle,
} from "@rotta/icons";
import { Badge, Button, Card, FormField, Input, Spinner, Typography } from "@rotta/ui/web";
import { useState, type FormEvent } from "react";

import type {
  Wallet,
  WalletTransaction,
  WalletTransactionStatus,
  WalletTransactionType,
  WithdrawalRequestStatus,
} from "@rotta/api-client";

import {
  useMyWallet,
  useMyWalletTransactions,
  useMyWithdrawalRequests,
  useRequestWithdrawal,
} from "@/features/wallet/hooks/use-wallet";


function centsToBRL(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const TIPO_LABEL: Record<WalletTransactionType, string> = {
  CREDITO_MENSALIDADE: "Mensalidade recebida",
  CREDITO_AJUSTE: "Ajuste (crédito)",
  CREDITO_ESTORNO: "Estorno de saque",
  DEBITO_SAQUE: "Saque",
  DEBITO_TARIFA: "Tarifa Rotta Pay",
  DEBITO_AJUSTE: "Ajuste (débito)",
};

const IS_CREDITO: Record<WalletTransactionType, boolean> = {
  CREDITO_MENSALIDADE: true,
  CREDITO_AJUSTE: true,
  CREDITO_ESTORNO: true,
  DEBITO_SAQUE: false,
  DEBITO_TARIFA: false,
  DEBITO_AJUSTE: false,
};

const TRANSACTION_STATUS_BADGE: Record<
  WalletTransactionStatus,
  { label: string; variant: "success" | "warning" | "danger" }
> = {
  CONCLUIDA: { label: "Concluída", variant: "success" },
  PENDENTE: { label: "Pendente", variant: "warning" },
  FALHOU: { label: "Falhou", variant: "danger" },
};

const WITHDRAWAL_STATUS_BADGE: Record<
  WithdrawalRequestStatus,
  { label: string; variant: "success" | "warning" | "danger" | "info" }
> = {
  SOLICITADO: { label: "Aguardando processamento", variant: "warning" },
  EM_PROCESSAMENTO: { label: "Em processamento", variant: "info" },
  CONCLUIDO: { label: "Concluído", variant: "success" },
  REJEITADO: { label: "Rejeitado", variant: "danger" },
};

/** Cartão visual da carteira — identidade da conta, NUNCA um meio de pagamento real emitido (nenhum parceiro emite cartão físico/virtual hoje). */
function WalletCard({ wallet }: { wallet: Wallet }): JSX.Element {
  return (
    <div className="relative aspect-[1.6/1] w-full max-w-sm overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-primary-dark p-6 text-white shadow-lg">
      <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10" />
      <div className="absolute -bottom-16 -left-10 h-48 w-48 rounded-full bg-white/5" />
      <div className="relative flex h-full flex-col justify-between">
        <div className="flex items-start justify-between">
          <Typography variant="subtitle" className="text-white">
            Rotta Pay
          </Typography>
          <CreditCard className="h-6 w-6 text-white/80" />
        </div>
        <div>
          <Typography variant="caption" className="text-white/70">
            Saldo disponível
          </Typography>
          <Typography variant="headline" className="text-white">
            {centsToBRL(wallet.saldoDisponivelCentavos)}
          </Typography>
        </div>
        <Typography variant="caption" className="text-white/60">
          {wallet.ownerType === "EMPRESA" ? "Conta da transportadora" : "Conta do motorista"} ·{" "}
          {wallet.moeda}
        </Typography>
      </div>
    </div>
  );
}

function WithdrawalForm({
  saldoDisponivelCentavos,
}: {
  saldoDisponivelCentavos: number;
}): JSX.Element {
  const requestWithdrawal = useRequestWithdrawal();
  const [valor, setValor] = useState("");
  const [chavePix, setChavePix] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent): Promise<void> {
    event.preventDefault();
    setFeedback(null);
    const valorCentavos = Math.round(Number(valor.replace(",", ".")) * 100);
    if (!valorCentavos || valorCentavos <= 0) {
      setFeedback("Informe um valor válido.");
      return;
    }
    try {
      await requestWithdrawal.mutateAsync({ valorCentavos, chavePix });
      setFeedback(
        "Saque solicitado — aguardando processamento manual (integração com a provedora de pagamento ainda não está ativa).",
      );
      setValor("");
      setChavePix("");
    } catch (error) {
      setFeedback(
        error instanceof ApiError ? error.message : "Não foi possível solicitar o saque.",
      );
    }
  }

  return (
    <form onSubmit={(event) => void handleSubmit(event)} className="flex flex-col gap-4">
      <FormField
        label="Valor do saque"
        helperText={`Disponível: ${centsToBRL(saldoDisponivelCentavos)}`}
      >
        <Input
          value={valor}
          onChange={(event) => setValor(event.target.value)}
          placeholder="0,00"
          inputMode="decimal"
        />
      </FormField>
      <FormField label="Chave PIX" helperText="CPF, CNPJ, e-mail, telefone ou chave aleatória">
        <Input value={chavePix} onChange={(event) => setChavePix(event.target.value)} />
      </FormField>
      {feedback && (
        <Typography variant="bodySmall" color="muted">
          {feedback}
        </Typography>
      )}
      <Button
        type="submit"
        variant="primary"
        isLoading={requestWithdrawal.isPending}
        iconLeft={<ArrowDownToLine className="h-4 w-4" />}
      >
        Solicitar saque
      </Button>
    </form>
  );
}

function TransactionRow({ transaction }: { transaction: WalletTransaction }): JSX.Element {
  const credito = IS_CREDITO[transaction.tipo];
  const statusBadge = TRANSACTION_STATUS_BADGE[transaction.status];
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border py-3 last:border-0">
      <div className="flex flex-col gap-0.5">
        <Typography variant="bodySmall">{TIPO_LABEL[transaction.tipo]}</Typography>
        <Typography variant="caption" color="muted">
          {new Date(transaction.createdAt).toLocaleString("pt-BR")}
        </Typography>
      </div>
      <div className="flex items-center gap-3">
        <Badge variant={statusBadge.variant}>{statusBadge.label}</Badge>
        <Typography variant="bodySmall" className={credito ? "text-success" : "text-danger"}>
          {credito ? "+" : "−"} {centsToBRL(transaction.valorCentavos)}
        </Typography>
      </div>
    </div>
  );
}

/**
 * Painel Rotta Pay da transportadora (Dossiê 26) — saldo, extrato e
 * saque. Referência visual: dashboard de pagamentos enviado pelo
 * usuário (cartão + saldo em destaque + extrato), com a identidade
 * própria da Rotta (Dossiê 24). O "cartão" é só identidade visual da
 * conta — nenhum meio de pagamento real é emitido hoje.
 */
export default function RottaPayPage(): JSX.Element {
  const { data: wallet, isLoading, isError, refetch, isRefetching } = useMyWallet();
  const { data: transactionsResult } = useMyWalletTransactions();
  const { data: withdrawalRequests } = useMyWithdrawalRequests();
  const [showWithdrawalForm, setShowWithdrawalForm] = useState(false);

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner size="lg" />
      </div>
    );
  }

  if (isError || !wallet) {
    return (
      <Typography variant="body" color="danger">
        Não foi possível carregar a carteira Rotta Pay.
      </Typography>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <WalletIcon className="h-6 w-6 text-primary" />
          <Typography variant="headline" as="h1">
            Rotta Pay
          </Typography>
          <Badge variant="info">Carteira da transportadora</Badge>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => void refetch()}
          isLoading={isRefetching}
          iconLeft={<RefreshCw className="h-4 w-4" />}
        >
          Atualizar
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <Card>
          <Card.Body className="flex flex-col gap-6">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <Typography variant="caption" color="muted">
                  Saldo disponível
                </Typography>
                <Typography variant="display" as="p">
                  {centsToBRL(wallet.saldoDisponivelCentavos)}
                </Typography>
              </div>
              <div className="flex items-center gap-2 rounded-lg bg-warning/10 px-3 py-2">
                <Clock3 className="h-4 w-4 text-warning" />
                <div>
                  <Typography variant="caption" color="muted">
                    A receber (pendente)
                  </Typography>
                  <Typography variant="bodySmall">
                    {centsToBRL(wallet.saldoPendenteCentavos)}
                  </Typography>
                </div>
              </div>
            </div>
            <Typography variant="bodySmall" color="muted">
              Mensalidades de contratos ativados aparecem aqui como pendentes até a confirmação de
              recebimento — a Rotta Pay ainda não tem uma provedora de pagamento totalmente
              integrada para confirmar isso automaticamente.
            </Typography>
            <Button
              variant="secondary"
              onClick={() => setShowWithdrawalForm((v) => !v)}
              iconLeft={<Landmark className="h-4 w-4" />}
            >
              {showWithdrawalForm ? "Cancelar saque" : "Solicitar saque"}
            </Button>
            {showWithdrawalForm && (
              <div className="border-t border-border pt-4">
                <WithdrawalForm saldoDisponivelCentavos={wallet.saldoDisponivelCentavos} />
              </div>
            )}
          </Card.Body>
        </Card>

        <div className="flex justify-center lg:justify-end">
          <WalletCard wallet={wallet} />
        </div>
      </div>

      <Card>
        <Card.Body className="flex flex-col gap-1">
          <Typography variant="subtitle" className="mb-2">
            Extrato
          </Typography>
          {transactionsResult && transactionsResult.items.length > 0 ? (
            transactionsResult.items.map((transaction) => (
              <TransactionRow key={transaction.id} transaction={transaction} />
            ))
          ) : (
            <Typography variant="bodySmall" color="muted">
              Nenhuma movimentação ainda.
            </Typography>
          )}
        </Card.Body>
      </Card>

      <Card>
        <Card.Body className="flex flex-col gap-3">
          <Typography variant="subtitle">Saques solicitados</Typography>
          {withdrawalRequests && withdrawalRequests.length > 0 ? (
            withdrawalRequests.map((withdrawal) => {
              const statusBadge = WITHDRAWAL_STATUS_BADGE[withdrawal.status];
              return (
                <div
                  key={withdrawal.id}
                  className="flex items-center justify-between border-b border-border py-2 last:border-0"
                >
                  <div>
                    <Typography variant="bodySmall">
                      {centsToBRL(withdrawal.valorCentavos)}
                    </Typography>
                    <Typography variant="caption" color="muted">
                      PIX: {withdrawal.chavePix} ·{" "}
                      {new Date(withdrawal.createdAt).toLocaleDateString("pt-BR")}
                    </Typography>
                    {withdrawal.motivoRejeicao && (
                      <Typography variant="caption" color="danger">
                        {withdrawal.motivoRejeicao}
                      </Typography>
                    )}
                  </div>
                  <Badge variant={statusBadge.variant}>
                    {withdrawal.status === "CONCLUIDO" ? (
                      <span className="flex items-center gap-1">
                        <CheckCircle2 className="h-3.5 w-3.5" /> {statusBadge.label}
                      </span>
                    ) : withdrawal.status === "REJEITADO" ? (
                      <span className="flex items-center gap-1">
                        <XCircle className="h-3.5 w-3.5" /> {statusBadge.label}
                      </span>
                    ) : (
                      statusBadge.label
                    )}
                  </Badge>
                </div>
              );
            })
          ) : (
            <Typography variant="bodySmall" color="muted">
              Nenhum saque solicitado ainda.
            </Typography>
          )}
        </Card.Body>
      </Card>
    </div>
  );
}
