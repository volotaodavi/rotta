"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type {
  DecideIdentityVerificationInput,
  ListAdminIdentityVerificationsParams,
} from "@rotta/api-client";

import { identityVerificationApi } from "@/lib/api-client";


/** Hooks de dados da Verificação de Identidade (Admin Rotta) — mesmo padrão TanStack Query de `use-companies.ts`. */
export function useIdentityVerificationsList(params: ListAdminIdentityVerificationsParams) {
  return useQuery({
    queryKey: ["identity-verifications", params],
    queryFn: () => identityVerificationApi.listAdmin(params),
  });
}

export function useIdentityVerification(userId: string) {
  return useQuery({
    queryKey: ["identity-verifications", userId],
    queryFn: () => identityVerificationApi.getAdmin(userId),
    enabled: Boolean(userId),
  });
}

/** Sincronização pull (`GET /v3/session/{id}/decision/`) — o botão "Sincronizar com a Didit" da tela de detalhe. */
export function useRefreshIdentityVerification(userId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => identityVerificationApi.refreshAdmin(userId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["identity-verifications", userId] });
      void queryClient.invalidateQueries({ queryKey: ["identity-verifications"], exact: false });
    },
  });
}

/** Decisão manual (aprovar/recusar) direto do painel, sem abrir o Business Console da Didit. */
export function useDecideIdentityVerification(userId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: DecideIdentityVerificationInput) =>
      identityVerificationApi.decideAdmin(userId, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["identity-verifications", userId] });
      void queryClient.invalidateQueries({ queryKey: ["identity-verifications"], exact: false });
    },
  });
}
