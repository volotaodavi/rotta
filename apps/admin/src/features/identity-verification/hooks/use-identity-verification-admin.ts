"use client";

import { useToast } from "@rotta/ui/web";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type {
  DecideIdentityVerificationInput,
  ListAdminIdentityVerificationsParams,
} from "@rotta/api-client";

import { identityVerificationApi } from "@/lib/api-client";

/** Mensagem de erro legível a partir do que `ApiClient.request` lança — mesmo padrão adotado nos novos `onError`, pra não vazar `"[object Object]"`/stack trace pra tela. */
function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

/** Hooks de dados da Verificação de Identidade (Admin Rotta) — mesmo padrão TanStack Query de `use-companies.ts`. */
export function useIdentityVerificationsList(params: ListAdminIdentityVerificationsParams) {
  return useQuery({
    queryKey: ["identity-verifications", params],
    queryFn: () => identityVerificationApi.listAdmin(params),
    // Fila de verificações pendentes — uma nova sessão da Didit precisa
    // aparecer sozinha (pedido do usuário 05/09/2026: "cada novidade
    // aparecerá de forma automática, sem precisar de atualização no
    // painel?").
    refetchInterval: 60_000,
  });
}

export function useIdentityVerification(userId: string) {
  return useQuery({
    queryKey: ["identity-verifications", userId],
    queryFn: () => identityVerificationApi.getAdmin(userId),
    enabled: Boolean(userId),
  });
}

/** Sincronização pull (`GET /v3/session/{id}/decision/`) — o botão "Sincronizar com a Didit" da tela de detalhe. */
export function useRefreshIdentityVerification(userId: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: () => identityVerificationApi.refreshAdmin(userId),
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: ["identity-verifications", userId] });
      void queryClient.invalidateQueries({ queryKey: ["identity-verifications"], exact: false });
      toast.success(`Status atual na Didit: ${data.status}.`, "Sincronizado");
    },
    // Pedido do usuário: "não está havendo ações nos botões" — sem isso,
    // uma falha aqui (ex.: sessão sem decisão ainda na Didit, credencial
    // ausente) só parava o spinner do botão, sem nenhum sinal na tela.
    onError: (error) => {
      toast.error(
        errorMessage(error, "Não foi possível sincronizar com a Didit."),
        "Falha ao sincronizar",
      );
    },
  });
}

/** Decisão manual (aprovar/recusar) direto do painel, sem abrir o Business Console da Didit. */
export function useDecideIdentityVerification(userId: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (input: DecideIdentityVerificationInput) =>
      identityVerificationApi.decideAdmin(userId, input),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: ["identity-verifications", userId] });
      void queryClient.invalidateQueries({ queryKey: ["identity-verifications"], exact: false });
      toast.success(
        variables.newStatus === "Approved" ? "Verificação aprovada." : "Verificação recusada.",
      );
    },
    onError: (error) => {
      toast.error(errorMessage(error, "Não foi possível registrar a decisão."), "Falha ao decidir");
    },
  });
}
