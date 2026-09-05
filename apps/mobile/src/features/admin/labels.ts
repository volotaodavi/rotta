import type { StatusPillTone } from "@/features/vehicles/components";
import type { AdminRottaPapel, PixKeyType } from "@rotta/api-client";

/** Mesmos rótulos de `apps/admin/src/app/(admin)/admin-contas/page.tsx` (paridade Web/App). */
export const ADMIN_PAPEL_LABEL: Record<AdminRottaPapel, string> = {
  GERAL: "Geral (acesso total)",
  SUPORTE: "Suporte",
  FINANCEIRO: "Financeiro",
};

export const ADMIN_PAPEL_TONE: Record<AdminRottaPapel, StatusPillTone> = {
  GERAL: "success",
  SUPORTE: "info",
  FINANCEIRO: "warning",
};

/** Mesmos rótulos de `asaas-account-section.tsx` (paridade Web/App). */
export const PIX_KEY_TYPE_LABEL: Record<PixKeyType, string> = {
  CPF: "CPF",
  CNPJ: "CNPJ",
  EMAIL: "E-mail",
  PHONE: "Telefone",
  EVP: "Chave aleatória",
};

/**
 * Tradução dos tipos mais comuns do extrato da Asaas (`docs.asaas.com`
 * — `financialTransactions`) — nunca uma lista fechada: tipo sem
 * tradução aqui cai no fallback de `tipoLancamentoLabel`.
 */
const TIPO_LANCAMENTO_LABEL: Record<string, string> = {
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

export function tipoLancamentoLabel(tipo: string): string {
  return (
    TIPO_LANCAMENTO_LABEL[tipo] ??
    tipo
      .replaceAll("_", " ")
      .toLowerCase()
      .replace(/^./, (c) => c.toUpperCase())
  );
}

/** "Coloque também as taxas retidas pelo Asaas" — qualquer tipo com "FEE" no nome é uma taxa retida. */
export function isTaxaLancamento(tipo: string): boolean {
  return tipo.includes("FEE");
}

export const PIX_CHARGE_STATUS_LABEL: Record<string, string> = {
  PENDING: "Aguardando pagamento",
  PAID: "Pago",
  EXPIRED: "Expirado",
  CANCELLED: "Cancelado",
  REFUNDED: "Reembolsado",
};

export const PAYMENT_STATUS_LABEL: Record<string, string> = {
  RECEIVED: "Recebido",
  CONFIRMED: "Confirmado",
  RECEIVED_IN_CASH: "Recebido (dinheiro)",
  PENDING: "Pendente",
  OVERDUE: "Vencido",
  REFUNDED: "Reembolsado",
  CHARGEBACK_REQUESTED: "Contestado",
};

export const PAYMENT_METODO_LABEL: Record<string, string> = {
  CREDIT_CARD: "Cartão de crédito",
  DEBIT_CARD: "Cartão de débito",
  BOLETO: "Boleto",
  PIX: "Pix",
};

/** Só um pagamento efetivamente recebido pode ser estornado. */
export const STATUS_ESTORNAVEL = new Set(["RECEIVED", "CONFIRMED", "RECEIVED_IN_CASH"]);
