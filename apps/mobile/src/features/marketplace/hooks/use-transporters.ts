import { useQuery } from "@tanstack/react-query";

import type { SearchTransportersParams } from "@rotta/api-client";

import { marketplaceApi } from "@/lib/api-client";


/**
 * Hooks de busca de transportadores (briefing "Marketplace" §"BUSCA"/
 * "TRANSPORTADORES"/"DETALHES") — sempre exige `latitude`/`longitude`
 * (de `useLocation`), mesma exigência do backend.
 */
export function useTransportersSearch(params: SearchTransportersParams | null) {
  return useQuery({
    queryKey: ["marketplace", "transporters", params],
    queryFn: () => marketplaceApi.searchTransporters(params as SearchTransportersParams),
    enabled: Boolean(params),
  });
}

export function useTransporterDetail(
  id: string | undefined,
  coords?: { latitude: number; longitude: number },
) {
  return useQuery({
    queryKey: ["marketplace", "transporters", id, coords],
    queryFn: () => marketplaceApi.getTransporterById(id as string, coords),
    enabled: Boolean(id),
  });
}
