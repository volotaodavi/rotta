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

const MY_JOIN_REQUEST_QUERY_KEY = ["company-join-requests", "me"];

/**
 * Lado do CANDIDATO (não da empresa) — último pedido de vínculo do
 * próprio Motorista/Monitor autônomo (Frente 9, `VinculoPendenteBlockScreen`),
 * `null` se nunca pediu nenhum. Mesmo endpoint/hook que o app nativo já
 * tinha (`useMyJoinRequest`, `apps/mobile/.../use-join-request.ts`) —
 * paridade web.
 */
export function useMyJoinRequest() {
  return useQuery({
    queryKey: MY_JOIN_REQUEST_QUERY_KEY,
    queryFn: () => companyJoinRequestsApi.findMine(),
  });
}

/** Envia um novo pedido de vínculo com o código público de uma transportadora — mesmo lado de `useMyJoinRequest`. */
export function useCreateJoinRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (codigoInterno: string) => companyJoinRequestsApi.create(codigoInterno),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: MY_JOIN_REQUEST_QUERY_KEY });
    },
  });
}
