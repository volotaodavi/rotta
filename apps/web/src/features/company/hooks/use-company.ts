"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type {
  AsaasPayment,
  CompanySettings,
  CreateAsaasCheckoutInput,
  CreatePreSignupAsaasInput,
  CreatePreSignupPixInput,
  PixCheckout,
  PreSignupCheckoutResult,
  PreSignupStatus,
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

/**
 * Checkout próprio da Rotta pra cartão de crédito/débito e boleto
 * (Dossiê 26 — "página própria para receber os pagamentos, porém
 * utilizando a Asaas por trás"). Pix continua em `useCreatePixCheckout`
 * — mesma tela (`/assinatura`), 100% Asaas por trás dos dois.
 */
export function useCreateAsaasCheckout() {
  return useMutation<AsaasPayment, unknown, CreateAsaasCheckoutInput>({
    mutationFn: (input) => billingApi.createAsaasCheckout(input),
  });
}

/** Polling enquanto aguarda o boleto ser pago/o cartão confirmar — mesmo papel de `usePixCheckoutStatus`. */
export function useAsaasCheckoutStatus(id: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: ["billing", "asaas-checkout", id],
    queryFn: () => billingApi.getAsaasCheckoutStatus(id as string),
    enabled: Boolean(id) && enabled,
    refetchInterval: (query) => (query.state.data?.status === "PENDING" ? 4_000 : false),
  });
}

/**
 * Segunda forma de assinar (Dossiê 26, pedido do usuário 31/08/2026) —
 * pagar ANTES de ter conta (`/planos/assinar`, tela pública, sem
 * sessão). Mesmo par create+status dos hooks autenticados acima, só que
 * o "status" aqui olha a `PendingSubscription` (`useMatch`
 * `getPreSignupStatus`), não o provedor direto — é o webhook quem marca
 * `PAGO`, nunca o polling sozinho.
 */
export function useCreatePreSignupPixCheckout() {
  return useMutation<PreSignupCheckoutResult<PixCheckout>, unknown, CreatePreSignupPixInput>({
    mutationFn: (input) => billingApi.createPreSignupPixCheckout(input),
  });
}

export function useCreatePreSignupAsaasCheckout() {
  return useMutation<PreSignupCheckoutResult<AsaasPayment>, unknown, CreatePreSignupAsaasInput>({
    mutationFn: (input) => billingApi.createPreSignupAsaasCheckout(input),
  });
}

/** Poll a cada 4s enquanto `PENDENTE` — mesmo ritmo de `usePixCheckoutStatus`/`useAsaasCheckoutStatus`, para assim que sair desse estado (`PAGO`/`EXPIRADO`/etc.). */
export function usePreSignupStatus(pendingId: string | undefined, enabled: boolean) {
  return useQuery<PreSignupStatus>({
    queryKey: ["billing", "pre-signup", pendingId],
    queryFn: () => billingApi.getPreSignupStatus(pendingId as string),
    enabled: Boolean(pendingId) && enabled,
    refetchInterval: (query) => (query.state.data?.status === "PENDENTE" ? 4_000 : false),
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
