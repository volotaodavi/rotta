"use client";

import { useQuery } from "@tanstack/react-query";

import { schoolPortalApi } from "@/lib/api-client";

/**
 * Portal da Escola — a lista de hoje.
 *
 * O `refetchInterval` de 15s é o mesmo da presença do app do Motorista
 * (`use-driver-trip.ts`): a escola usa esta tela em pé, no portão, no
 * meio da saída, e a pergunta dela ("já embarcou?") muda de resposta a
 * cada criança que sobe no ônibus. Uma tela que só atualiza no F5 não
 * serve para esse momento.
 */
export function useAlunosDoDia() {
  return useQuery({
    queryKey: ["school-portal", "alunos-hoje"],
    queryFn: () => schoolPortalApi.listarAlunosDoDia(),
    refetchInterval: 15_000,
  });
}
