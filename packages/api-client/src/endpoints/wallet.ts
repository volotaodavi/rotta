import { buildQueryString } from "../query.util";

import type { ApiClient } from "../http";

/**
 * Endpoints tipados do módulo Rotta Pay (Dossiê 26) — espelham
 * `apps/api/src/modules/wallet`. `me*` são as rotas de auto-serviço
 * (Empresa/Gestor/Motorista, só a PRÓPRIA carteira); `admin*` são
 * exclusivas de Admin Rotta.
 */

export type WalletOwnerType = "EMPRESA" | "MOTORISTA";
export type WalletTransactionType =
  | "CREDITO_MENSALIDADE"
  | "CREDITO_AJUSTE"
  | "CREDITO_ESTORNO"
  | "DEBITO_SAQUE"
  | "DEBITO_TARIFA"
  | "DEBITO_AJUSTE";
export type WalletTransactionStatus = "PENDENTE" | "CONCLUIDA" | "FALHOU";
export type WithdrawalRequestStatus = "SOLICITADO" | "EM_PROCESSAMENTO" | "CONCLUIDO" | "REJEITADO";

export interface Wallet {
  id: string;
  ownerType: WalletOwnerType;
  companyId: string | null;
  motoristaId: string | null;
  saldoDisponivelCentavos: number;
  saldoPendenteCentavos: number;
  moeda: string;
  createdAt: string;
  updatedAt: string;
}

export interface WalletTransaction {
  id: string;
  walletId: string;
  tipo: WalletTransactionType;
  status: WalletTransactionStatus;
  valorCentavos: number;
  saldoDisponivelAposCentavos: number;
  descricao: string;
  contractId: string | null;
  withdrawalRequestId: string | null;
  criadaPorUserId: string | null;
  createdAt: string;
}

export interface ListWalletTransactionsParams {
  page?: number;
  pageSize?: number;
}

export interface ListWalletTransactionsResult {
  items: WalletTransaction[];
  total: number;
  page: number;
  pageSize: number;
}

export interface WithdrawalRequest {
  id: string;
  walletId: string;
  valorCentavos: number;
  chavePix: string;
  status: WithdrawalRequestStatus;
  solicitadoPorUserId: string;
  providerReferencia: string | null;
  motivoRejeicao: string | null;
  processadoEm: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RequestWithdrawalInput {
  valorCentavos: number;
  chavePix: string;
}

interface ApiEnvelope<T> {
  data: T;
}

export function createWalletEndpoints(apiClient: ApiClient) {
  return {
    getMyWallet: async (): Promise<Wallet> =>
      (await apiClient.request<ApiEnvelope<Wallet>>("/wallet/me")).data,

    listMyTransactions: async (
      params: ListWalletTransactionsParams = {},
    ): Promise<ListWalletTransactionsResult> =>
      (
        await apiClient.request<ApiEnvelope<ListWalletTransactionsResult>>(
          `/wallet/me/transactions${buildQueryString(params)}`,
        )
      ).data,

    listMyWithdrawalRequests: async (): Promise<WithdrawalRequest[]> =>
      (await apiClient.request<ApiEnvelope<WithdrawalRequest[]>>("/wallet/me/withdrawal-requests"))
        .data,

    requestWithdrawal: async (input: RequestWithdrawalInput): Promise<WithdrawalRequest> =>
      (
        await apiClient.request<ApiEnvelope<WithdrawalRequest>>("/wallet/me/withdrawal-requests", {
          method: "POST",
          body: input,
        })
      ).data,

    admin: {
      getWallet: async (walletId: string): Promise<Wallet> =>
        (await apiClient.request<ApiEnvelope<Wallet>>(`/wallet/admin/${walletId}`)).data,

      listTransactions: async (
        walletId: string,
        params: ListWalletTransactionsParams = {},
      ): Promise<ListWalletTransactionsResult> =>
        (
          await apiClient.request<ApiEnvelope<ListWalletTransactionsResult>>(
            `/wallet/admin/${walletId}/transactions${buildQueryString(params)}`,
          )
        ).data,

      confirmarCredito: async (transactionId: string): Promise<WalletTransaction> =>
        (
          await apiClient.request<ApiEnvelope<WalletTransaction>>(
            `/wallet/admin/transactions/${transactionId}/confirmar`,
            { method: "PATCH" },
          )
        ).data,

      concluirSaque: async (withdrawalRequestId: string): Promise<WithdrawalRequest> =>
        (
          await apiClient.request<ApiEnvelope<WithdrawalRequest>>(
            `/wallet/admin/withdrawal-requests/${withdrawalRequestId}/concluir`,
            { method: "PATCH" },
          )
        ).data,

      rejeitarSaque: async (
        withdrawalRequestId: string,
        motivo: string,
      ): Promise<WithdrawalRequest> =>
        (
          await apiClient.request<ApiEnvelope<WithdrawalRequest>>(
            `/wallet/admin/withdrawal-requests/${withdrawalRequestId}/rejeitar`,
            { method: "PATCH", body: { motivo } },
          )
        ).data,
    },
  };
}
