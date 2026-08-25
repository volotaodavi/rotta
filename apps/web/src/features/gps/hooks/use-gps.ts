"use client";

import { useQueries, useQuery } from "@tanstack/react-query";

import type { MapVehicle, StudentEventsHistoryRange } from "@rotta/api-client";

import { gpsApi } from "@/lib/api-client";


/**
 * Cadência do polling de posição ao vivo (GPS-01/03/06) — pedido do
 * usuário: "diminuir o tempo de mostrar o veículo se movendo... algo
 * que fique suave e contínuo até o encerramento da rota" (era 10s).
 * `RottaMap` (`@rotta/maps/web`) anima o marcador suavemente ENTRE duas
 * posições consecutivas por `VEHICLE_MOVE_ANIMATION_MS` (também ~3s) —
 * os dois valores andam juntos: o marcador termina de deslizar até a
 * posição atual pouco antes da próxima chegar, sem "saltar".
 */
const GPS_LIVE_POLL_INTERVAL_MS = 3_000;

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
    refetchInterval: GPS_LIVE_POLL_INTERVAL_MS,
  });
}

/**
 * Trilha de posições de uma viagem (`GET /gps/trips/:tripId/track`) — o
 * único endpoint de GPS que Motorista/Monitor podem chamar sobre a
 * própria viagem (`getMap`/`getForStudent` são restritos a
 * Empresa/Gestor/Admin/Responsável). `refetchInterval` igual aos demais
 * hooks de mapa ao vivo (`useGpsMap`/`useGpsForStudent`) — usado pra
 * mostrar o próprio veículo em movimento em `minha-rota/page.tsx`.
 */
export function useGpsTrack(tripId: string | undefined) {
  return useQuery({
    queryKey: ["gps", "track", tripId],
    queryFn: () => gpsApi.getTrack(tripId!),
    enabled: Boolean(tripId),
    refetchInterval: GPS_LIVE_POLL_INTERVAL_MS,
  });
}

/**
 * Localizador do Responsável (briefing "Marketplace" §"ACOMPANHAMENTO"
 * — mapa/GPS/ETA da viagem do próprio filho, GPS-01/03/06). Mesmo hook
 * que já existia no app mobile (`apps/mobile/src/features/gps/hooks/
 * use-gps.ts`) — faltava a versão web, que é o gap fechado por esta
 * entrega (`/alunos/:id/mapa`). Polling substitui um canal em tempo
 * real dedicado (WebSocket, `apps/realtime-gateway`, ainda não
 * implementado) — mesmo princípio do restante do módulo GPS.
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
 * Histórico de embarque/desembarque do próprio filho (modelo de
 * referência enviado pelo usuário — abas "Hoje"/"Semana"/"Mês" na tela
 * de acompanhamento do Responsável, `GET /gps/students/:id/events-
 * history`). Sem polling — histórico não muda a cada 10s como a
 * posição ao vivo, só quando um novo evento é registrado (o
 * `TripStudentEvent` mais recente já aparece na aba "Hoje" assim que a
 * página é revisitada).
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

/**
 * Mapa combinado de "Meus Alunos" (`/alunos`) — um marcador por filho
 * que tenha viagem em curso agora, todos no mesmo mapa em vez de só o
 * badge "Em viagem" por card. Mesma `queryKey` (`["gps", "student", id]`)
 * de `useGpsForStudent`, então react-query DEDUPLICA com as chamadas já
 * feitas por cada `StudentCard` — nenhuma requisição extra à API, só
 * agrega o que os cards já buscam. Recebe `{id, nome}` (não só o id) —
 * `MapVehicle` não carrega o nome do aluno, só da rota/motorista.
 */
export function useGpsForStudents(students: { id: string; nome: string }[]) {
  return useQueries({
    queries: students.map(({ id }) => ({
      queryKey: ["gps", "student", id],
      queryFn: () => gpsApi.getForStudent(id),
      refetchInterval: GPS_LIVE_POLL_INTERVAL_MS,
    })),
    combine: (results) => ({
      isLoading: results.some((r) => r.isLoading),
      data: results
        .map((r, index) => ({ student: students[index]!, vehicle: r.data }))
        .filter(
          (row): row is { student: { id: string; nome: string }; vehicle: MapVehicle } =>
            row.vehicle !== null && row.vehicle !== undefined,
        ),
    }),
  });
}
