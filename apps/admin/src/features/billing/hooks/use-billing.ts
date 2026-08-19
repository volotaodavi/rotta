"use client";

import { useQuery } from "@tanstack/react-query";

import { billingApi } from "@/lib/api-client";

/**
 * Visão financeira da mensalidade da plataforma (Dossiê 26) — valores
 * recebidos via AbacatePay, taxa retida, empresas/planos ativos. Painel
 * puramente interno do Admin Rotta (`GET /billing/admin/overview`).
 */
export function useBillingAdminOverview() {
  return useQuery({
    queryKey: ["billing", "admin-overview"],
    queryFn: () => billingApi.getAdminOverview(),
  });
}
