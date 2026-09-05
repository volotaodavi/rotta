"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { CreateAdminPixChargeInput, CreateAdminTransferInput } from "@rotta/api-client";

import { billingApi } from "@/lib/api-client";

/**
 * Visão financeira da mensalidade da plataforma (Dossiê 26) — valores
 * recebidos via Asaas, taxa retida, empresas/planos ativos. Painel
 * puramente interno do Admin Rotta (`GET /billing/admin/overview`).
 */
export function useBillingAdminOverview() {
  return useQuery({
    queryKey: ["billing", "admin-overview"],
    queryFn: () => billingApi.getAdminOverview(),
    refetchInterval: 60_000,
  });
}

/**
 * Saldo atual da conta Asaas da Rotta (Frente 33, pedido do usuário
 * 03/09/2026: "área financeira... saldo atual"). `refetchInterval`
 * curto — dinheiro entrando/saindo é o dado mais sensível a ficar
 * desatualizado desta tela inteira.
 */
export function useBillingAdminBalance() {
  return useQuery({
    queryKey: ["billing", "admin-balance"],
    queryFn: () => billingApi.getAdminBalance(),
    refetchInterval: 60_000,
  });
}

/** Extrato paginado da conta Asaas da Rotta ("olhar o extrato"). */
export function useBillingAdminStatement(page: number, pageSize = 20) {
  return useQuery({
    queryKey: ["billing", "admin-statement", page, pageSize],
    queryFn: () => billingApi.getAdminStatement({ page, pageSize }),
  });
}

/**
 * Extrato completo de pagamentos de UMA empresa (pedido do usuário
 * 03/09/2026: "extrato completo de cada usuário que adquiriu o
 * plano"). `enabled` — só busca quando a linha da empresa é expandida
 * (`CompanyPaymentHistoryRow`), nunca N chamadas automáticas pra cada
 * empresa da lista de uma vez.
 */
export function useCompanyPaymentHistory(companyId: string, enabled: boolean) {
  return useQuery({
    queryKey: ["billing", "company-payments", companyId],
    queryFn: () => billingApi.getCompanyPaymentHistory(companyId),
    enabled,
  });
}

/**
 * Transferência Pix pra fora da conta ("fazer transferências") —
 * GERAL-only no backend; a tela só chega a montar este hook/botão pro
 * papel certo (ver `FinanceiroPage`). Invalida saldo/extrato/overview
 * no sucesso — a transferência move dinheiro de verdade.
 */
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

/**
 * Cobrança Pix avulsa (pedido do usuário 03/09/2026: "posso pedir o
 * recebimento de transferências... incluindo o QR Code pix?") —
 * recebível, `AdminRottaPapel.FINANCEIRO` também aciona.
 */
export function useCreateAdminPixCharge() {
  return useMutation({
    mutationFn: (input: CreateAdminPixChargeInput) => billingApi.createAdminPixCharge(input),
  });
}

/** Polling da cobrança avulsa enquanto o pagador não paga/o webhook não chega — mesmo ritmo de `usePixCheckoutStatus` (apps/web). */
export function useAdminPixChargeStatus(id: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: ["billing", "admin-pix-charge", id],
    queryFn: () => billingApi.getAdminPixChargeStatus(id as string),
    enabled: Boolean(id) && enabled,
    refetchInterval: (query) => (query.state.data?.status === "PENDING" ? 4_000 : false),
  });
}

/** Estorno manual de um pagamento — GERAL-only no backend. Invalida extrato/saldo/histórico da empresa, dinheiro de verdade voltando pra conta. */
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

/** Cancela a assinatura Asaas de uma empresa — GERAL-only no backend. Invalida a lista de empresas ativas e o histórico dela. */
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
