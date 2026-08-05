import type { StatusPillTone } from "@/features/vehicles/components/status-pill";
import type {
  WalletTransactionStatus,
  WalletTransactionType,
  WithdrawalRequestStatus,
} from "@rotta/api-client";

export const WALLET_TIPO_LABEL: Record<WalletTransactionType, string> = {
  CREDITO_MENSALIDADE: "Mensalidade recebida",
  CREDITO_AJUSTE: "Ajuste (crédito)",
  CREDITO_ESTORNO: "Estorno de saque",
  DEBITO_SAQUE: "Saque",
  DEBITO_TARIFA: "Tarifa Rotta Pay",
  DEBITO_AJUSTE: "Ajuste (débito)",
};

export const WALLET_IS_CREDITO: Record<WalletTransactionType, boolean> = {
  CREDITO_MENSALIDADE: true,
  CREDITO_AJUSTE: true,
  CREDITO_ESTORNO: true,
  DEBITO_SAQUE: false,
  DEBITO_TARIFA: false,
  DEBITO_AJUSTE: false,
};

export const WALLET_TRANSACTION_STATUS_LABEL: Record<WalletTransactionStatus, string> = {
  PENDENTE: "Pendente",
  CONCLUIDA: "Concluída",
  FALHOU: "Falhou",
};

export const WALLET_TRANSACTION_STATUS_TONE: Record<WalletTransactionStatus, StatusPillTone> = {
  PENDENTE: "warning",
  CONCLUIDA: "success",
  FALHOU: "danger",
};

export const WITHDRAWAL_STATUS_LABEL: Record<WithdrawalRequestStatus, string> = {
  SOLICITADO: "Aguardando processamento",
  EM_PROCESSAMENTO: "Em processamento",
  CONCLUIDO: "Concluído",
  REJEITADO: "Rejeitado",
};

export const WITHDRAWAL_STATUS_TONE: Record<WithdrawalRequestStatus, StatusPillTone> = {
  SOLICITADO: "warning",
  EM_PROCESSAMENTO: "info",
  CONCLUIDO: "success",
  REJEITADO: "danger",
};
