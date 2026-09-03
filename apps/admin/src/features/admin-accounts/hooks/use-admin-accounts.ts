"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { CreateAdminAccountInput, UpdateAdminAccountInput } from "@rotta/api-client";

import { adminAccountsApi } from "@/lib/api-client";


/**
 * Hooks de dados de "Contas Admin" (pedido do usuário 03/09/2026 —
 * GERAL-only, o backend recusa qualquer outro papel via
 * `AdminAreaGuard`). Mesmo padrão de `use-plan-notices.ts`.
 */
export function useAdminAccountsList() {
  return useQuery({
    queryKey: ["admin-accounts"],
    queryFn: () => adminAccountsApi.list(),
  });
}

export function useCreateAdminAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateAdminAccountInput) => adminAccountsApi.create(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin-accounts"] });
    },
  });
}

export function useUpdateAdminAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateAdminAccountInput }) =>
      adminAccountsApi.update(id, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin-accounts"] });
    },
  });
}
