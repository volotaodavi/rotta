"use client";

import { useQuery } from "@tanstack/react-query";

import { gpsApi } from "@/lib/api-client";

/**
 * Hooks de dados do "localizador"/mapa (GPS-01/03/06, painel web —
 * Empresa/Gestor). `refetchInterval` faz o polling que substitui um
 * WebSocket dedicado (`apps/realtime-gateway`, Dossiê 12 Seção 1.3,
 * ainda não implementado nesta fase) — mesmo princípio documentado em
 * `gps.module.ts` do backend: "o frontend hoje faz polling do REST".
 */
export function useGpsMap(companyId?: string) {
  return useQuery({
    queryKey: ["gps", "map", companyId],
    queryFn: () => gpsApi.getMap(companyId),
    refetchInterval: 10_000,
  });
}

export function useGpsTrack(tripId: string | undefined) {
  return useQuery({
    queryKey: ["gps", "track", tripId],
    queryFn: () => gpsApi.getTrack(tripId!),
    enabled: Boolean(tripId),
  });
}

/**
 * Localizador do Responsável (briefing "Marketplace" §"ACOMPANHAMENTO"
 * — mapa/GPS/ETA da viagem do próprio filho, GPS-01/03/06). Mesmo hook
 * que já existia no app mobile (`apps/mobile/src/features/gps/hooks/
 * use-gps.ts`) — faltava a versão web, que é o gap fechado por esta
 * entrega (`/alunos/:id/mapa`). Polling a cada 10s substitui um canal
 * em tempo real dedicado (WebSocket, `apps/realtime-gateway`, ainda não
 * implementado) — mesmo princípio do restante do módulo GPS.
 */
export function useGpsForStudent(studentId: string | undefined) {
  return useQuery({
    queryKey: ["gps", "student", studentId],
    queryFn: () => gpsApi.getForStudent(studentId as string),
    enabled: Boolean(studentId),
    refetchInterval: 10_000,
  });
}
