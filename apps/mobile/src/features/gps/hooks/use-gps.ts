import { useQuery } from "@tanstack/react-query";

import type { StudentEventsHistoryRange } from "@rotta/api-client";

import { gpsApi } from "@/lib/api-client";

/**
 * Cadência do polling de posição ao vivo (GPS-01/03/06) — pedido do
 * usuário: "diminuir o tempo de mostrar o veículo se movendo... algo
 * que fique suave e contínuo até o encerramento da rota" (era 10s).
 * `RottaMap` (`@rotta/maps/native`) anima o marcador suavemente ENTRE
 * duas posições consecutivas por um período equivalente — o marcador
 * termina de deslizar até a posição atual pouco antes da próxima
 * chegar, sem "saltar".
 */
const GPS_LIVE_POLL_INTERVAL_MS = 3_000;

/**
 * "Mapa" da frota da Empresa/Gestor (Frente B do plano "lacunas
 * Empresa/Gestor no app" — pedido do usuário 12/09/2026: "traga o que
 * tem na Web pro app") — mirror exato de
 * `apps/web/src/features/gps/hooks/use-gps.ts#useGpsMap`: um marcador
 * por VIAGEM em andamento agora, `GET /gps/map`. `companyId` só é
 * usado pelo Admin Rotta (mapa nacional); Empresa/Gestor chama sem
 * parâmetro — o backend já escopa pelo `tenantId` do ator.
 */
export function useGpsMap(companyId?: string) {
  return useQuery({
    queryKey: ["gps", "map", companyId],
    queryFn: () => gpsApi.getMap(companyId),
    refetchInterval: GPS_LIVE_POLL_INTERVAL_MS,
  });
}

/**
 * Localizador do Responsável (briefing "Marketplace" §"ACOMPANHAMENTO"
 * — mapa/GPS/ETA da viagem do próprio filho, GPS-01/03/06). Polling
 * substitui um canal em tempo real dedicado (WebSocket,
 * `apps/realtime-gateway`, ainda não implementado) — mesmo princípio
 * documentado em `gps.module.ts` do backend.
 */
export function useGpsForStudent(studentId: string | undefined) {
  return useQuery({
    queryKey: ["gps", "student", studentId],
    queryFn: () => gpsApi.getForStudent(studentId as string),
    enabled: Boolean(studentId),
    refetchInterval: GPS_LIVE_POLL_INTERVAL_MS,
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
    refetchInterval: GPS_LIVE_POLL_INTERVAL_MS,
  });
}

/**
 * Histórico de embarque/desembarque do próprio filho (modelo de
 * referência enviado pelo usuário — abas "Hoje"/"Semana"/"Mês" na tela
 * "Viagens" do Responsável, `GET /gps/students/:id/events-history`).
 * Mesmo hook e mesma ausência de polling já existentes na versão web
 * (`apps/web/src/features/gps/hooks/use-gps.ts`) — histórico não muda a
 * cada 10s como a posição ao vivo, só quando um novo evento é
 * registrado.
 */
export function useStudentEventsHistory(
  studentId: string | undefined,
  range: StudentEventsHistoryRange,
) {
  return useQuery({
    queryKey: ["gps", "student", studentId, "events-history", range],
    queryFn: () => gpsApi.getStudentEventsHistory(studentId as string, range),
    enabled: Boolean(studentId),
  });
}
