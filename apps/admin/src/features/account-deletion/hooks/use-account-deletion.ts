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
 * Pré-cadastros que nunca viraram conta (02/10/2026: "mostre os
 * cadastros não contemplados também"). Lista separada de propósito:
 * não são `User`, não têm vínculo, não têm identidade — o que eles
 * têm é um pagamento no meio do caminho.
 */
export function usePreCadastros(params: { q?: string; limit?: number }) {
  return useQuery({
    queryKey: ["account-deletion", "pre-cadastros", params],
    queryFn: () => accountDeletionApi.listarPreCadastros(params),
  });
}

export function useDeletePreCadastro() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => accountDeletionApi.excluirPreCadastro(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["account-deletion", "pre-cadastros"] });
      void queryClient.invalidateQueries({ queryKey: ["backoffice"] });
    },
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
