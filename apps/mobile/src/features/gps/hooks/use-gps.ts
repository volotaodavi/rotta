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

/**
 * Trilha de posições de uma viagem (`GET /gps/trips/:tripId/track`) — o
 * único endpoint de GPS que Motorista/Monitor podem chamar sobre a
 * própria viagem (`getForStudent` é restrito ao Responsável). Mesmo
 * hook e mesmo `refetchInterval` já existentes na versão web
 * (`apps/web/src/features/gps/hooks/use-gps.ts`) — usado pra mostrar o
 * próprio veículo em movimento em `inicio-screen.tsx`.
 */
export function useGpsTrack(tripId: string | undefined) {
  return useQuery({
    queryKey: ["gps", "track", tripId],
    queryFn: () => gpsApi.getTrack(tripId as string),
    enabled: Boolean(tripId),
    refetchInterval: 10_000,
  });
}
