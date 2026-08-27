"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { CreatePlanNoticeInput, ListPlanNoticesParams } from "@rotta/api-client";

import { planNoticesApi } from "@/lib/api-client";

/**
 * Hooks de dados dos Avisos de Plano (Dossiê 26, painel Admin "Controle
 * de Planos") — espelha `use-companies.ts`. Sempre `Role.ADMIN_ROTTA`
 * (backend garante via `@Roles`).
 */
export function usePlanNoticesList(params: ListPlanNoticesParams) {
  return useQuery({
    queryKey: ["plan-notices", params],
    queryFn: () => planNoticesApi.list(params),
  });
}

export function useCreatePlanNotice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreatePlanNoticeInput) => planNoticesApi.create(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["plan-notices"] });
    },
  });
}

export function useSetPlanNoticeAtivo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ativo }: { id: string; ativo: boolean }) =>
      ativo ? planNoticesApi.ativar(id) : planNoticesApi.desativar(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["plan-notices"] });
    },
  });
}
