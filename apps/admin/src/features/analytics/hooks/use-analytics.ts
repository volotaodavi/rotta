"use client";

import { useQuery } from "@tanstack/react-query";

import type { NationalKpisParams } from "@rotta/api-client";

import { analyticsApi } from "@/lib/api-client";


/** Hooks de dados da Central de Inteligência Operacional (Prompt 22/Dossiê 30). */
export function useNationalKpis(params: NationalKpisParams = {}) {
  return useQuery({
    queryKey: ["analytics", "national", "kpis", params],
    queryFn: () => analyticsApi.getNationalKpis(params),
    // Mesmo raciocínio de `useBackofficeDashboard`: números "de saúde
    // nacional" atualizam sozinhos, sem exigir refresh manual.
    refetchInterval: 60_000,
  });
}

export function useNationalHeatmap() {
  return useQuery({
    queryKey: ["analytics", "national", "heatmap"],
    queryFn: () => analyticsApi.getNationalHeatmap(),
  });
}
