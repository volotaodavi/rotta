"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type {
  IdentityVerificationSessionResponse,
  IdentityVerificationStatusResponse,
} from "@rotta/api-client";

import { identityVerificationApi } from "@/lib/api-client";

const QUERY_KEY = ["identity-verification", "me"];

/**
 * Status atual da verificação de identidade do usuário logado —
 * Motorista/Monitor/Empresa/Gestor (Roles em
 * `IdentityVerificationController`). `enabled` default `true` — quem
 * chama passa `false` pro papel Responsável, que o backend nem aceita
 * neste endpoint (`SELF_VERIFICATION_ROLES` não inclui `responsavel`),
 * usado por `(dashboard)/layout.tsx` para o bloqueio total quando
 * `status === "REPROVADA"`.
 */
export function useMyIdentityVerification(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => identityVerificationApi.getMyStatus(),
    enabled: options?.enabled ?? true,
  });
}

/**
 * Cria a sessão hospedada na Didit — o chamador é responsável por abrir
 * `session.url` (SDK web/iframe/redirect). Invalida o status ao
 * concluir: o webhook da Didit ainda não aplicou nada nesse instante
 * (a sessão acabou de nascer), mas já reflete `EM_ANDAMENTO`, setado
 * por `IdentityVerificationService.createSession` na mesma chamada.
 */
export function useCreateIdentityVerificationSession() {
  const queryClient = useQueryClient();
  return useMutation<IdentityVerificationSessionResponse, unknown, { callbackUrl?: string }>({
    mutationFn: (input) => identityVerificationApi.createMySession(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}

/**
 * Sincroniza (pull) o status direto na Didit — gap real relatado em
 * produção: "Atualizar status" chamava só `refetch()` do `useQuery`
 * acima, ou seja, um `SELECT` no nosso banco. Enquanto o webhook da
 * Didit não aplica nada (destino mal configurado, entrega falhando
 * etc.), esse `SELECT` nunca muda — o botão parecia clicável à toa,
 * "Em andamento" para sempre. Este hook chama
 * `POST /identity-verification/me/refresh`, que busca a decisão direto
 * na Didit (mesmo mecanismo que o Admin Rotta já usa desde a Frente C)
 * e já devolve o status atualizado, sem depender do webhook.
 */
export function useRefreshMyIdentityVerification() {
  const queryClient = useQueryClient();
  return useMutation<IdentityVerificationStatusResponse, unknown, void>({
    mutationFn: () => identityVerificationApi.refreshMyStatus(),
    onSuccess: (result) => {
      queryClient.setQueryData(QUERY_KEY, result);
    },
  });
}
