"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { CreateCompanyJoinPreRegistrationInput } from "@rotta/api-client";

import { companyJoinPreRegistrationsApi } from "@/lib/api-client";


const JOIN_PRE_REGISTRATIONS_QUERY_KEY = ["company-join-pre-registrations"];

/**
 * "Convites" (pedido do usuário 02/09/2026) — pré-cadastros de celular/
 * nome que a empresa faz pra liberar o vínculo automaticamente quando a
 * pessoa certa informar o código, em vez de cair no fluxo manual de
 * "Pedidos de vínculo pendentes" (`use-join-requests.ts`).
 */
export function useJoinPreRegistrations() {
  return useQuery({
    queryKey: JOIN_PRE_REGISTRATIONS_QUERY_KEY,
    queryFn: () => companyJoinPreRegistrationsApi.list(),
  });
}

export function useCreateJoinPreRegistration() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateCompanyJoinPreRegistrationInput) =>
      companyJoinPreRegistrationsApi.create(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: JOIN_PRE_REGISTRATIONS_QUERY_KEY });
    },
  });
}

export function useCancelJoinPreRegistration() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => companyJoinPreRegistrationsApi.cancel(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: JOIN_PRE_REGISTRATIONS_QUERY_KEY });
    },
  });
}
