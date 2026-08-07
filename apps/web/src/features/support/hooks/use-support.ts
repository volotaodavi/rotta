"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { CreateSupportTicketInput, ListSupportTicketsParams } from "@rotta/api-client";

import { supportApi } from "@/lib/api-client";

/** Hooks de dados do módulo Suporte (Dossiê 20, `SUP-01` a `SUP-03`; Dossiê 29). */
export function useSupportTickets(params: ListSupportTicketsParams = {}) {
  return useQuery({
    queryKey: ["support-tickets", params],
    queryFn: () => supportApi.listTickets(params),
  });
}

export function useSupportTicketDetail(ticketId: string) {
  return useQuery({
    queryKey: ["support-tickets", ticketId],
    queryFn: () => supportApi.getTicketDetail(ticketId),
    enabled: Boolean(ticketId),
  });
}

export function useCreateSupportTicket() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateSupportTicketInput) => supportApi.createTicket(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["support-tickets"] });
    },
  });
}

export function useAddSupportMessage(ticketId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (mensagem: string) => supportApi.addMessage(ticketId, mensagem),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["support-tickets", ticketId] });
      void queryClient.invalidateQueries({ queryKey: ["support-tickets"] });
    },
  });
}

export function useCloseSupportTicket(ticketId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => supportApi.closeTicket(ticketId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["support-tickets", ticketId] });
      void queryClient.invalidateQueries({ queryKey: ["support-tickets"] });
    },
  });
}
