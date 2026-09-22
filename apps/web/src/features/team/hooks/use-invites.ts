"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { Role } from "@rotta/api-client";

import { authApi } from "@/lib/api-client";

/**
 * Convite de papel para Motorista/Monitor (Dossiê 15, endpoint
 * `POST /companies/:companyId/invites` já existia pronto desde a
 * Frente [Auth] — nenhuma tela em `apps/web` o usava até agora. Pedido
 * do usuário: "a janela de 'equipe' deve ter a possibilidade de
 * adicionar outro motorista e adicionar um monitor". Gera um código
 * (`/convite/:codigo`, já existente) que a pessoa resgata sozinha —
 * "pré-cadastro" no sentido de que o vínculo só existe de fato depois
 * que ela completar o próprio cadastro com o código.
 */
/**
 * `schoolId` só existe para o convite de `escola` (Portal da Escola,
 * 22/09/2026) — o backend exige em `ESCOLA` e recusa nos demais papéis,
 * então passá-lo por engano falha alto em vez de criar um convite
 * silenciosamente errado.
 */
export interface CriarConviteInput {
  role: Role;
  schoolId?: string;
}

export function useCreateInvite(companyId: string | null | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ role, schoolId }: CriarConviteInput) => {
      if (!companyId) throw new Error("Empresa não identificada.");
      return authApi.createInvite(companyId, role, schoolId);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["team", "invites", companyId] });
    },
  });
}
