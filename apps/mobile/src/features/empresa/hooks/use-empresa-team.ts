import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { CreateCompanyJoinPreRegistrationInput } from "@rotta/api-client";

import {
  companyJoinPreRegistrationsApi,
  companyJoinRequestsApi,
  driversApi,
} from "@/lib/api-client";

/**
 * Hooks de Equipe pro lado da Empresa/Gestor. `useMyTeam` nasceu na
 * Frente 4 (Rotas precisa do nome do motorista); o resto (pedidos de
 * vínculo pendentes, convites) entrou na Frente 5.
 */
export function useMyTeam() {
  return useQuery({
    queryKey: ["empresa", "team"],
    queryFn: () => driversApi.listTeam(),
  });
}

const JOIN_REQUESTS_QUERY_KEY = ["empresa", "join-requests", "pending"];

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
      void queryClient.invalidateQueries({ queryKey: ["empresa", "team"] });
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

const JOIN_PRE_REGISTRATIONS_QUERY_KEY = ["empresa", "join-pre-registrations"];

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
