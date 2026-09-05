import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { CreateAdminPixChargeInput, CreateAdminTransferInput } from "@rotta/api-client";

import { billingApi } from "@/lib/api-client";

/**
 * Hooks de dados do Financeiro completo do Admin no app (pedido do
 * usuário 05/09/2026: "pode adicionar o financeiro completo para admins
 * no app") — espelham 1:1
 * `apps/admin/src/features/billing/hooks/use-billing.ts`, mesmos
 * `queryKey`s e `refetchInterval`.
 */
export function useAdminBillingOverview() {
  return useQuery({
    queryKey: ["billing", "admin-overview"],
    queryFn: () => billingApi.getAdminOverview(),
    refetchInterval: 60_000,
  });
}

export function useAdminBillingBalance() {
  return useQuery({
    queryKey: ["billing", "admin-balance"],
    queryFn: () => billingApi.getAdminBalance(),
    refetchInterval: 60_000,
  });
}

export function useAdminBillingStatement(page: number, pageSize = 30) {
  return useQuery({
    queryKey: ["billing", "admin-statement", page, pageSize],
    queryFn: () => billingApi.getAdminStatement({ page, pageSize }),
  });
}

export function useAdminCompanyPaymentHistory(companyId: string, enabled: boolean) {
  return useQuery({
    queryKey: ["billing", "company-payments", companyId],
    queryFn: () => billingApi.getCompanyPaymentHistory(companyId),
    enabled,
  });
}

/** Transferência Pix pra fora da conta — GERAL-only no backend; a tela só monta este botão pro papel certo. */
export function useCreateAdminTransfer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateAdminTransferInput) => billingApi.createAdminTransfer(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["billing", "admin-balance"] });
      void queryClient.invalidateQueries({ queryKey: ["billing", "admin-statement"] });
      void queryClient.invalidateQueries({ queryKey: ["billing", "admin-overview"] });
    },
  });
}

/** Cobrança Pix avulsa — GERAL e FINANCEIRO acionam. */
export function useCreateAdminPixCharge() {
  return useMutation({
    mutationFn: (input: CreateAdminPixChargeInput) => billingApi.createAdminPixCharge(input),
  });
}

export function useAdminPixChargeStatus(id: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: ["billing", "admin-pix-charge", id],
    queryFn: () => billingApi.getAdminPixChargeStatus(id as string),
    enabled: Boolean(id) && enabled,
    refetchInterval: (query) => (query.state.data?.status === "PENDING" ? 4_000 : false),
  });
}

/** Estorno manual de um pagamento — GERAL-only no backend. */
export function useRefundAdminPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (paymentId: string) => billingApi.refundAdminPayment(paymentId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["billing", "admin-balance"] });
      void queryClient.invalidateQueries({ queryKey: ["billing", "admin-statement"] });
      void queryClient.invalidateQueries({ queryKey: ["billing", "company-payments"] });
    },
  });
}

/** Cancela a assinatura Asaas de uma empresa — GERAL-only no backend. */
export function useCancelCompanySubscription() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (companyId: string) => billingApi.cancelCompanySubscription(companyId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["billing", "admin-overview"] });
      void queryClient.invalidateQueries({ queryKey: ["billing", "company-payments"] });
    },
  });
}
