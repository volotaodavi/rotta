"use client";

import { ApiError } from "@rotta/api-client";
import { ChevronDown, ChevronUp, CircleX, Undo2 } from "@rotta/icons";
import { Badge, Button, Spinner, Typography } from "@rotta/ui/web";
import { useState } from "react";

import type { BillingAdminCompanySummary } from "@rotta/api-client";

import {
  useCancelCompanySubscription,
  useCompanyPaymentHistory,
  useRefundAdminPayment,
} from "@/features/billing/hooks/use-billing";

function centsToBRL(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof ApiError ? error.message : fallback;
}

/** Só um pagamento efetivamente recebido pode ser estornado — nunca oferece o botão pra `PENDING`/`OVERDUE`/já `REFUNDED`/`CHARGEBACK_REQUESTED`. */
const STATUS_ESTORNAVEL = new Set(["RECEIVED", "CONFIRMED", "RECEIVED_IN_CASH"]);

const STATUS_LABEL: Record<string, string> = {
  RECEIVED: "Recebido",
  CONFIRMED: "Confirmado",
  RECEIVED_IN_CASH: "Recebido (dinheiro)",
  PENDING: "Pendente",
  OVERDUE: "Vencido",
  REFUNDED: "Reembolsado",
  CHARGEBACK_REQUESTED: "Contestado",
};

const METODO_LABEL: Record<string, string> = {
  CREDIT_CARD: "Cartão de crédito",
  DEBIT_CARD: "Cartão de débito",
  BOLETO: "Boleto",
  PIX: "Pix",
};

/**
 * Uma empresa na lista "Empresas usando o plano" — clicar expande o
 * extrato completo de pagamentos DAQUELA empresa (pedido do usuário
 * 03/09/2026: "extrato completo de cada usuário que adquiriu o
 * plano... qual foi o usuário, qual conta pagou"). Busca sob demanda
 * (`enabled` só quando expandido) — nunca N chamadas de uma vez pra
 * lista inteira.
 */
export function CompanyPaymentHistoryRow({
  empresa,
  podeGerenciar = false,
}: {
  empresa: BillingAdminCompanySummary;
  /** Ações que mexem em dinheiro/assinatura de verdade (estornar, cancelar) — mesmo nível de risco de `TransferForm`, só pro papel Geral. */
  podeGerenciar?: boolean;
}): JSX.Element {
  const [expandido, setExpandido] = useState(false);
  const [erroAcao, setErroAcao] = useState<string | null>(null);
  const { data, isLoading } = useCompanyPaymentHistory(empresa.id, expandido);
  const cancelarAssinatura = useCancelCompanySubscription();
  const estornarPagamento = useRefundAdminPayment();

  function handleCancelarAssinatura(): void {
    setErroAcao(null);
    const confirmado = window.confirm(
      `Cancelar a assinatura Asaas de ${empresa.nomeFantasia}? Ela para de ser cobrada e o status vira CANCELADO — não dá pra desfazer por aqui.`,
    );
    if (!confirmado) return;
    cancelarAssinatura.mutate(empresa.id, {
      onError: (err) =>
        setErroAcao(errorMessage(err, "Não foi possível cancelar a assinatura. Tente novamente.")),
    });
  }

  function handleEstornar(pagamentoId: string, valorCentavos: number): void {
    setErroAcao(null);
    const confirmado = window.confirm(
      `Estornar o pagamento de ${centsToBRL(valorCentavos)}? O valor volta pro pagador e sai da conta da Rotta.`,
    );
    if (!confirmado) return;
    estornarPagamento.mutate(pagamentoId, {
      onError: (err) =>
        setErroAcao(errorMessage(err, "Não foi possível estornar o pagamento. Tente novamente.")),
    });
  }

  return (
    <div className="flex flex-col">
      {/*
        `<div role="button">`, não um `<button>` de verdade — precisa
        aninhar o botão real "Cancelar assinatura" ali dentro, e HTML
        não permite elemento interativo dentro de `<button>` (mesma
        ressalva já documentada em `packages/ui/.../Button.tsx` sobre
        `<a><button>` — gera duplo-toque no Safari/iPhone).
      */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => setExpandido((atual) => !atual)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") setExpandido((atual) => !atual);
        }}
        className="flex w-full flex-wrap items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-muted"
      >
        <div>
          <Typography variant="bodySmall" className="font-medium">
            {empresa.nomeFantasia}
          </Typography>
          <Typography variant="caption" color="muted">
            {empresa.razaoSocial} · ativa desde{" "}
            {new Date(empresa.ativaDesde).toLocaleDateString("pt-BR")}
          </Typography>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="neutral">{empresa.planoNome}</Badge>
          {empresa.asaasSubscriptionId ? (
            <Badge variant="info">Assinatura ativa (Asaas)</Badge>
          ) : (
            <Badge variant="warning">Sem assinatura recorrente</Badge>
          )}
          {podeGerenciar && empresa.asaasSubscriptionId && (
            <Button
              variant="ghost"
              size="sm"
              iconLeft={<CircleX className="h-3.5 w-3.5" />}
              isLoading={cancelarAssinatura.isPending}
              onClick={(event) => {
                event.stopPropagation();
                handleCancelarAssinatura();
              }}
            >
              Cancelar assinatura
            </Button>
          )}
          {expandido ? (
            <ChevronUp className="h-4 w-4 text-text-muted" />
          ) : (
            <ChevronDown className="h-4 w-4 text-text-muted" />
          )}
        </div>
      </div>

      {erroAcao && (
        <Typography variant="caption" color="danger" className="px-4 pb-2">
          {erroAcao}
        </Typography>
      )}

      {expandido && (
        <div className="border-t border-border bg-muted/30 px-4 py-3">
          {isLoading ? (
            <div className="flex justify-center py-4">
              <Spinner size="sm" />
            </div>
          ) : !data || data.items.length === 0 ? (
            <Typography variant="caption" color="muted">
              {data?.note ?? "Nenhum pagamento encontrado pra esta empresa."}
            </Typography>
          ) : (
            <div className="flex flex-col gap-2">
              {data.note && (
                <Typography variant="caption" color="muted">
                  {data.note}
                </Typography>
              )}
              <div className="overflow-x-auto">
                <table className="w-full min-w-[480px] text-left text-xs">
                  <thead>
                    <tr className="text-text-muted">
                      <th className="py-1 pr-3 font-medium">Data</th>
                      <th className="py-1 pr-3 font-medium">Método</th>
                      <th className="py-1 pr-3 font-medium">Status</th>
                      <th className="py-1 pr-3 font-medium">Valor</th>
                      <th className="py-1 pr-3 font-medium">Taxa</th>
                      <th className="py-1 pr-3 font-medium">Líquido</th>
                      {podeGerenciar && <th className="py-1 font-medium" />}
                    </tr>
                  </thead>
                  <tbody>
                    {data.items.map((item) => (
                      <tr key={item.id} className="border-t border-border/60">
                        <td className="py-1.5 pr-3">
                          {item.data ? new Date(item.data).toLocaleDateString("pt-BR") : "-"}
                        </td>
                        <td className="py-1.5 pr-3">{METODO_LABEL[item.metodo] ?? item.metodo}</td>
                        <td className="py-1.5 pr-3">{STATUS_LABEL[item.status] ?? item.status}</td>
                        <td className="py-1.5 pr-3 font-medium">
                          {centsToBRL(item.valorCentavos)}
                        </td>
                        <td className="py-1.5 pr-3 text-text-muted">
                          {item.taxaCentavos === null ? "-" : centsToBRL(item.taxaCentavos)}
                        </td>
                        <td className="py-1.5 pr-3">
                          {item.liquidoCentavos === null ? "-" : centsToBRL(item.liquidoCentavos)}
                        </td>
                        {podeGerenciar && (
                          <td className="py-1.5">
                            {STATUS_ESTORNAVEL.has(item.status) && (
                              <Button
                                variant="ghost"
                                size="sm"
                                iconLeft={<Undo2 className="h-3.5 w-3.5" />}
                                isLoading={estornarPagamento.isPending}
                                onClick={() => handleEstornar(item.id, item.valorCentavos)}
                              >
                                Estornar
                              </Button>
                            )}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
