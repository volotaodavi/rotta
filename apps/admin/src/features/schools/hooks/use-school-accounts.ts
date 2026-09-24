"use client";

import { useToast } from "@rotta/ui/web";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { CriarContaDaEscolaInput } from "@rotta/api-client";

import { schoolPortalContasApi } from "@/lib/api-client";

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

/**
 * Contas do Portal da Escola (fluxo público, 22-24/09/2026).
 *
 * O Admin da Rotta cria o DIRETOR de cada escola; o diretor abre acesso
 * para coordenador e ajudante da própria escola. É aritmética: numa
 * rede com 40 escolas e 3 pessoas cada são 120 contas, e passar todas
 * pelo Admin faria do cadastro o gargalo da adoção.
 */
export function useSchoolAccounts(escolaId: string) {
  return useQuery({
    queryKey: ["school-accounts", escolaId],
    queryFn: () => schoolPortalContasApi.listar(escolaId),
    enabled: Boolean(escolaId),
  });
}

export function useCreateSchoolAccount(escolaId: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (input: CriarContaDaEscolaInput) => schoolPortalContasApi.criar(input),
    onSuccess: (conta) => {
      void queryClient.invalidateQueries({ queryKey: ["school-accounts", escolaId] });
      toast.success(`Acesso criado para ${conta.nome}. Entregue o e-mail e a senha à escola.`);
    },
    onError: (error) => {
      toast.error(errorMessage(error, "Não foi possível criar a conta."), "Falha");
    },
  });
}

export function useSetSchoolAccountStatus(escolaId: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: ({ contaId, ativo }: { contaId: string; ativo: boolean }) =>
      schoolPortalContasApi.definirStatus(contaId, ativo),
    onSuccess: (_conta, { ativo }) => {
      void queryClient.invalidateQueries({ queryKey: ["school-accounts", escolaId] });
      toast.success(ativo ? "Acesso reativado." : "Acesso desativado.");
    },
    onError: (error) => {
      toast.error(errorMessage(error, "Não foi possível alterar o acesso."), "Falha");
    },
  });
}
