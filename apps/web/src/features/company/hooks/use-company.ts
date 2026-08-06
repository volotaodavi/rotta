"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { CompanySettings, CreateCheckoutResult, UpdateCompanyInput } from "@rotta/api-client";

import { billingApi, companiesApi } from "@/lib/api-client";

/**
 * Hooks de dados da "Minha Empresa" (Dossie 16) — visão da própria
 * empresa pelo usuário Administrador/Gestor, não a listagem de tenants
 * do Admin Rotta (essa vive em `apps/admin`).
 */
export function useMyCompany(companyId: string) {
  return useQuery({
    queryKey: ["my-company", companyId],
    queryFn: () => companiesApi.getById(companyId),
    enabled: Boolean(companyId),
  });
}

export function useMyCompanyDashboard(companyId: string) {
  return useQuery({
    queryKey: ["my-company", companyId, "dashboard"],
    queryFn: () => companiesApi.getDashboard(companyId),
    enabled: Boolean(companyId),
  });
}

export function useMyCompanySettings(companyId: string) {
  return useQuery({
    queryKey: ["my-company", companyId, "settings"],
    queryFn: () => companiesApi.getSettings(companyId),
    enabled: Boolean(companyId),
  });
}

export function useUpdateMyCompany(companyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateCompanyInput) => companiesApi.update(companyId, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["my-company", companyId] });
    },
  });
}

/**
 * Inicia um checkout de assinatura da mensalidade da Rotta (Dossiê 26,
 * R$ 39,90/mês) via AbacatePay — só chamado a partir de `TrialBanner`
 * (empresa/transportadora/autônomo). Nunca usado por Responsável, que
 * não tem `Company`/plano.
 */
export function useCreateCheckout() {
  return useMutation<CreateCheckoutResult, unknown, { returnUrl: string }>({
    mutationFn: (input) => billingApi.createCheckout(input),
  });
}

export function useUpdateMyCompanySettings(companyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Partial<CompanySettings>) => companiesApi.updateSettings(companyId, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["my-company", companyId, "settings"] });
    },
  });
}
