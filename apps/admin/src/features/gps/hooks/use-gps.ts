"use client";

import { useQuery } from "@tanstack/react-query";

import { gpsApi } from "@/lib/api-client";

/**
 * Cadência do polling de posição ao vivo — mesmo valor de
 * `apps/web/src/features/gps/hooks/use-gps.ts` (pedido do usuário:
 * "diminuir o tempo de mostrar o veículo se movendo... suave e
 * contínuo", era 10s).
 */
const GPS_LIVE_POLL_INTERVAL_MS = 3_000;

/**
 * "Mapa Nacional de Veículos" do Admin Rotta — mesmo princípio
 * cross-tenant do `useSchoolMarkers` (Escolas): `GET /gps/map` SEM
 * `companyId` devolve TODAS as viagens `EM_ANDAMENTO` de TODAS as
 * empresas (`TripsService.listActiveForMap`), cada marcador já com
 * `companyNome` pra identificar de quem é. Polling, mesmo princípio de
 * `apps/web/src/features/gps/hooks/use-gps.ts` (nenhum canal em tempo
 * real dedicado ainda).
 */
export function useGpsMapNationwide() {
  return useQuery({
    queryKey: ["gps", "map", "nacional"],
    queryFn: () => gpsApi.getMap(),
    refetchInterval: GPS_LIVE_POLL_INTERVAL_MS,
  });
}
