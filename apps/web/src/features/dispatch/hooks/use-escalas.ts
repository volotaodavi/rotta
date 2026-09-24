"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { DefinirEscalaInput } from "@rotta/api-client";

import { escalasApi } from "@/lib/api-client";

/**
 * Escala do dia (24/09/2026) — o rodízio do despachante.
 *
 * Convive com o padrão da rota numa precedência simples: **escala do
 * dia vence o padrão**. Rota que sempre sai com o mesmo carro e o mesmo
 * motorista não precisa de escala; a escala existe para o dia que foge
 * disso.
 */
export function useEscalasDoDia(data: string) {
  return useQuery({
    queryKey: ["escalas", data],
    queryFn: () => escalasApi.listarPorDia(data),
    enabled: Boolean(data),
  });
}

export function useDefinirEscala() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: DefinirEscalaInput) => escalasApi.definir(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["escalas"] });
    },
  });
}

export function useRemoverEscala() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => escalasApi.remover(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["escalas"] });
    },
  });
}
