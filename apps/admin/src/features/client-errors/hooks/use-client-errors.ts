"use client";

import { useQuery } from "@tanstack/react-query";

import type { ListClientErrorReportsParams } from "@rotta/api-client";

import { clientErrorsApi } from "@/lib/api-client";

/**
 * Hook de dados de `GET /client-errors` (Admin Rotta, Frente 1 —
 * captura de erro real do cliente). Só leitura: este relatório existe
 * pra investigação, não há decisão a tomar aqui como nas filas de
 * revisão (compare com `use-vehicles.ts`).
 */
export function useClientErrorReportsList(params: ListClientErrorReportsParams) {
  return useQuery({
    queryKey: ["client-errors", params],
    queryFn: () => clientErrorsApi.list(params),
    // Fila de investigação — um erro novo reportado por um usuário
    // precisa aparecer sozinho (pedido do usuário 05/09/2026: "cada
    // novidade aparecerá de forma automática, sem precisar de
    // atualização no painel?").
    refetchInterval: 60_000,
  });
}
