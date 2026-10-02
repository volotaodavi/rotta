"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { ListarContasParams } from "@rotta/api-client";

import { accountDeletionApi } from "@/lib/api-client";

/** Lista de contas da tela "Contas" — a única do painel que enxerga usuário por usuário. */
export function useContasParaExclusao(params: ListarContasParams) {
  return useQuery({
    queryKey: ["account-deletion", "contas", params],
    queryFn: () => accountDeletionApi.listarContas(params),
  });
}

/**
 * Exclusão definitiva (Admin Rotta). O `preview` é sempre uma query
 * separada, habilitada só quando o modal abre: é o que mostra o estrago
 * ANTES de o botão existir, numa operação sem volta.
 */
export function useCompanyDeletionPreview(companyId: string, enabled: boolean) {
  return useQuery({
    queryKey: ["account-deletion", "company", companyId],
    queryFn: () => accountDeletionApi.previewEmpresa(companyId),
    enabled,
    // Sem cache: a empresa pode ter mudado entre abrir e confirmar.
    staleTime: 0,
    gcTime: 0,
  });
}

export function useDeleteCompany() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (companyId: string) => accountDeletionApi.excluirEmpresa(companyId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["companies"] });
      void queryClient.invalidateQueries({ queryKey: ["backoffice"] });
    },
  });
}

export function useAccountDeletionPreview(userId: string, enabled: boolean) {
  return useQuery({
    queryKey: ["account-deletion", "user", userId],
    queryFn: () => accountDeletionApi.previewConta(userId),
    enabled,
    staleTime: 0,
    gcTime: 0,
  });
}

export function useDeleteAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => accountDeletionApi.excluirConta(userId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["identity-verifications"] });
      void queryClient.invalidateQueries({ queryKey: ["backoffice"] });
    },
  });
}
