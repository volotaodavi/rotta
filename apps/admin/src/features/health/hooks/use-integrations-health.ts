"use client";

import { useQuery } from "@tanstack/react-query";

import { healthApi } from "@/lib/api-client";

/** "Rotta Control Center" (Dossiê 44) — saúde real acumulada, não um ping artificial; refetch curto para o painel ficar próximo de tempo real sem sobrecarregar. */
export function useIntegrationsHealth() {
  return useQuery({
    queryKey: ["health", "integrations"],
    queryFn: () => healthApi.getIntegrationsHealth(),
    refetchInterval: 30_000,
  });
}
