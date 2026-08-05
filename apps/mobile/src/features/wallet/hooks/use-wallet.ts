import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { RequestWithdrawalInput } from "@rotta/api-client";

import { walletApi } from "@/lib/api-client";


/**
 * Hooks de dados do Rotta Pay (Dossiê 26) — carteira própria do
 * Motorista (`/wallet/me/*`, mesma API do painel web da transportadora,
 * ver `apps/web/src/features/wallet/hooks/use-wallet.ts`).
 */
export function useMyWallet() {
  return useQuery({
    queryKey: ["wallet", "me"],
    queryFn: () => walletApi.getMyWallet(),
  });
}

export function useMyWalletTransactions(page = 1, pageSize = 20) {
  return useQuery({
    queryKey: ["wallet", "me", "transactions", page, pageSize],
    queryFn: () => walletApi.listMyTransactions({ page, pageSize }),
  });
}

export function useMyWithdrawalRequests() {
  return useQuery({
    queryKey: ["wallet", "me", "withdrawal-requests"],
    queryFn: () => walletApi.listMyWithdrawalRequests(),
  });
}

export function useRequestWithdrawal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: RequestWithdrawalInput) => walletApi.requestWithdrawal(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["wallet", "me"] });
    },
  });
}
