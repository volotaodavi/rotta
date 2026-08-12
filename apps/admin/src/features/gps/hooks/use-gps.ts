"use client";

import { useQuery } from "@tanstack/react-query";

import { gpsApi } from "@/lib/api-client";

/**
 * "Mapa Nacional de Veículos" do Admin Rotta — mesmo princípio
 * cross-tenant do `useSchoolMarkers` (Escolas): `GET /gps/map` SEM
 * `companyId` devolve TODAS as viagens `EM_ANDAMENTO` de TODAS as
 * empresas (`TripsService.listActiveForMap`), cada marcador já com
 * `companyNome` pra identificar de quem é. Polling a cada 10s, mesmo
 * princípio de `apps/web/src/features/gps/hooks/use-gps.ts` (nenhum
 * canal em tempo real dedicado ainda).
 */
export function useGpsMapNationwide() {
  return useQuery({
    queryKey: ["gps", "map", "nacional"],
    queryFn: () => gpsApi.getMap(),
    refetchInterval: 10_000,
  });
}
