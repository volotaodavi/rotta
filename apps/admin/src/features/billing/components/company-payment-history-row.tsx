"use client";

import { ChevronDown, ChevronUp } from "@rotta/icons";
import { Badge, Spinner, Typography } from "@rotta/ui/web";
import { useState } from "react";

import type { BillingAdminCompanySummary } from "@rotta/api-client";

import { useCompanyPaymentHistory } from "@/features/billing/hooks/use-billing";


function centsToBRL(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

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
}: {
  empresa: BillingAdminCompanySummary;
}): JSX.Element {
  const [expandido, setExpandido] = useState(false);
  const { data, isLoading } = useCompanyPaymentHistory(empresa.id, expandido);

  return (
    <div className="flex flex-col">
      <button
        type="button"
        onClick={() => setExpandido((atual) => !atual)}
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
          {empresa.abacatepaySubscriptionId && <Badge variant="info">Pix (AbacatePay)</Badge>}
          {empresa.asaasSubscriptionId && <Badge variant="info">Cartão/Boleto (Asaas)</Badge>}
          {!empresa.abacatepaySubscriptionId && !empresa.asaasSubscriptionId && (
            <Badge variant="warning">Sem assinatura recorrente</Badge>
          )}
          {expandido ? (
            <ChevronUp className="h-4 w-4 text-text-muted" />
          ) : (
            <ChevronDown className="h-4 w-4 text-text-muted" />
          )}
        </div>
      </button>

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
                      <th className="py-1 font-medium">Líquido</th>
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
                        <td className="py-1.5">
                          {item.liquidoCentavos === null ? "-" : centsToBRL(item.liquidoCentavos)}
                        </td>
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
