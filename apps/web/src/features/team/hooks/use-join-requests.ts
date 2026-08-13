"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { companyJoinRequestsApi } from "@/lib/api-client";

const JOIN_REQUESTS_QUERY_KEY = ["company-join-requests", "pending"];

/**
 * Pedidos de vínculo PENDENTE (Frente N, briefing item 9) — Motorista/
 * Monitor autônomo que informou o código público da própria empresa
 * (`Company.codigoInterno`, mesmo código do Marketplace) pedindo pra
 * entrar. Aparece em "Equipe" ao lado da lista de quem já é vinculado.
 */
export function usePendingJoinRequests() {
  return useQuery({
    queryKey: JOIN_REQUESTS_QUERY_KEY,
    queryFn: () => companyJoinRequestsApi.findPending(),
  });
}

export function useApproveJoinRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => companyJoinRequestsApi.approve(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: JOIN_REQUESTS_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: ["team", "me"] });
    },
  });
}

export function useRejectJoinRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, motivo }: { id: string; motivo?: string }) =>
      companyJoinRequestsApi.reject(id, motivo),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: JOIN_REQUESTS_QUERY_KEY });
    },
  });
}
