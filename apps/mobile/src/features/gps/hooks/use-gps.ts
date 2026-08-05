import { useQuery } from "@tanstack/react-query";

import { gpsApi } from "@/lib/api-client";

/**
 * Localizador do Responsável (briefing "Marketplace" §"ACOMPANHAMENTO"
 * — mapa/GPS/ETA da viagem do próprio filho, GPS-01/03/06). Polling a
 * cada 10s substitui um canal em tempo real dedicado (WebSocket,
 * `apps/realtime-gateway`, ainda não implementado) — mesmo princípio
 * documentado em `gps.module.ts` do backend.
 */
export function useGpsForStudent(studentId: string | undefined) {
  return useQuery({
    queryKey: ["gps", "student", studentId],
    queryFn: () => gpsApi.getForStudent(studentId as string),
    enabled: Boolean(studentId),
    refetchInterval: 10_000,
  });
}
