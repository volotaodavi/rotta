"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type {
  CompanySettings,
  CreateCheckoutResult,
  PixCheckout,
  UpdateCompanyInput,
} from "@rotta/api-client";

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

/**
 * Checkout Pix embutido (pedido do usuário: "pagar sem precisar ir em
 * outro lugar") — devolve QR Code + copia-e-cola direto, sem nenhuma
 * página hospedada envolvida (ver `PixCheckoutModal`).
 */
export function useCreatePixCheckout() {
  return useMutation<PixCheckout, unknown, void>({
    mutationFn: () => billingApi.createPixCheckout(),
  });
}

/**
 * Polling do status do Pix enquanto o modal está aberto — o webhook
 * (`billing.paid`) continua sendo a fonte de verdade que efetivamente
 * ativa a empresa; isto só decide quando fechar o modal sozinho.
 * `refetchInterval` para assim que sair de `PENDING`.
 */
export function usePixCheckoutStatus(id: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: ["billing", "pix-checkout", id],
    queryFn: () => billingApi.getPixCheckoutStatus(id as string),
    enabled: Boolean(id) && enabled,
    refetchInterval: (query) => (query.state.data?.status === "PENDING" ? 4_000 : false),
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
