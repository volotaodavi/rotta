"use client";

import { useQuery } from "@tanstack/react-query";

import { tripsApi } from "@/lib/api-client";

/**
 * Hooks de leitura do módulo Trips consumidos pelo acompanhamento do
 * Responsável (`/alunos/:id/mapa`) — a viagem em si (posição ao vivo)
 * vem de `useGpsForStudent` (`features/gps`); estes dois complementam
 * com o que falta pra contar a história completa da viagem: próximas
 * paradas com ETA recalculado (tarefa #99) e o histórico de embarque/
 * desembarque do dia.
 */
export function useTripProximasEtas(tripId: string | undefined) {
  return useQuery({
    queryKey: ["trips", tripId, "proximas-etas"],
    queryFn: () => tripsApi.getProximasEtas(tripId as string),
    enabled: Boolean(tripId),
    refetchInterval: 30_000,
  });
}

export function useTripStudentEvents(tripId: string | undefined) {
  return useQuery({
    queryKey: ["trips", tripId, "student-events"],
    queryFn: () => tripsApi.listStudentEvents(tripId as string),
    enabled: Boolean(tripId),
    refetchInterval: 30_000,
  });
}
