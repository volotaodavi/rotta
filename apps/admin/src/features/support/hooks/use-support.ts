"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { ListSupportTicketsParams } from "@rotta/api-client";

import { supportApi } from "@/lib/api-client";

/** Hooks de dados do módulo Suporte, visão Admin Rotta (`ADM-04`/Dossiê 29). */
export function useSupportTickets(params: ListSupportTicketsParams) {
  return useQuery({
    queryKey: ["support-tickets", params],
    queryFn: () => supportApi.listTickets(params),
    // Fila de chamados — novo chamado aberto por uma transportadora
    // precisa aparecer sozinho (pedido do usuário 05/09/2026: "cada
    // novidade aparecerá de forma automática, sem precisar de
    // atualização no painel?").
    refetchInterval: 30_000,
  });
}

export function useSupportTicketDetail(ticketId: string, companyId?: string) {
  return useQuery({
    queryKey: ["support-tickets", ticketId, companyId],
    queryFn: () => supportApi.getTicketDetail(ticketId, companyId),
    enabled: Boolean(ticketId),
    // Conversa estilo chat (pedido do usuário 03/09/2026) — mensagem
    // nova da transportadora precisa aparecer sem o Admin precisar
    // sair e voltar na tela, mesmo raciocínio de qualquer chat de
    // verdade.
    refetchInterval: 10_000,
  });
}

export function useAddSupportMessage(ticketId: string, companyId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (mensagem: string) => supportApi.addMessage(ticketId, mensagem, companyId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["support-tickets", ticketId] });
      void queryClient.invalidateQueries({ queryKey: ["support-tickets"] });
    },
  });
}

export function useCloseSupportTicket(ticketId: string, companyId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => supportApi.closeTicket(ticketId, companyId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["support-tickets", ticketId] });
      void queryClient.invalidateQueries({ queryKey: ["support-tickets"] });
    },
  });
}

/** Arquivar/desarquivar (pedido do usuário 02/09/2026) — estado "à parte" do status normal, ver `SupportService.setArquivado`. */
export function useArchiveSupportTicket(ticketId: string, companyId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => supportApi.archiveTicket(ticketId, companyId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["support-tickets", ticketId] });
      void queryClient.invalidateQueries({ queryKey: ["support-tickets"] });
    },
  });
}

export function useUnarchiveSupportTicket(ticketId: string, companyId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => supportApi.unarchiveTicket(ticketId, companyId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["support-tickets", ticketId] });
      void queryClient.invalidateQueries({ queryKey: ["support-tickets"] });
    },
  });
}
