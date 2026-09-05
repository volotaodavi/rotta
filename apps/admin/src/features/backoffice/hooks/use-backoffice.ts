"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { backofficeApi } from "@/lib/api-client";

/** Hooks de dados da tela inicial do Admin Rotta (Prompt 21 / Dossiê 29 — `ADM-01`). */
export function useBackofficeDashboard() {
  return useQuery({
    queryKey: ["backoffice", "dashboard"],
    queryFn: () => backofficeApi.getDashboard(),
    // Números "de saúde da plataforma" — atualiza sozinho a cada minuto
    // sem exigir refresh manual do Admin Rotta.
    refetchInterval: 60_000,
  });
}

export function useApprovalQueue(limit = 20) {
  return useQuery({
    queryKey: ["backoffice", "approvals", limit],
    queryFn: () => backofficeApi.listApprovals(limit),
    // Fila de trabalho real do Admin (pedido do usuário 05/09/2026: "cada
    // novidade aparecerá de forma automática, sem precisar de
    // atualização no painel?") — mesmo ritmo do sino/badge que já conta
    // este mesmo total (`useBackofficeDashboard`).
    refetchInterval: 60_000,
  });
}

/** `ADM-01`/`RN-10`: "Acessar como suporte" — sempre com justificativa, sempre auditado. */
export function useAccessAsSupport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ companyId, motivo }: { companyId: string; motivo: string }) =>
      backofficeApi.accessAsSupport(companyId, motivo),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["companies"] });
    },
  });
}
