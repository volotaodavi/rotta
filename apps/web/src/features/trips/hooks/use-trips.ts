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

/**
 * Presença de hoje de um lote de alunos (fluxo novo de Rotas — "ao
 * reiniciar a rota" pra pegar os alunos NA escola, quem faltou de
 * manhã não deve aparecer como pendente de embarque). Usado pela tela
 * de execução (`/rotas/[id]/executar`) só quando existe pelo menos uma
 * parada de embarque referenciando uma escola (`RouteStop.schoolId`) —
 * o sinal de que esta é a "volta". `refetchInterval` mais curto que os
 * dois hooks acima: o resultado muda a cada embarque/ausência
 * registrado em QUALQUER rota da empresa hoje, não só nesta viagem.
 */
export function useStudentsAttendanceToday(studentIds: string[]) {
  return useQuery({
    queryKey: ["trips", "students-attendance-today", studentIds],
    queryFn: () => tripsApi.getAttendanceToday(studentIds),
    enabled: studentIds.length > 0,
    refetchInterval: 15_000,
  });
}
