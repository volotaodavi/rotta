import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { StartTripInput } from "@rotta/api-client";

import { tripsApi } from "@/lib/api-client";

/**
 * Ciclo de vida da viagem do dia, do lado do Motorista/Monitor (Prompt
 * Mestre da Rotta, Seção 8 — "o sistema deve diferenciar ONLINE/
 * OFFLINE/EM_VIAGEM/PAUSADO/VIAGEM_FINALIZADA"). `findTodayByRoute`
 * devolve a viagem de hoje independente do status (ou `null`) — a tela
 * decide o que mostrar a partir do `status` real, nunca inventa um
 * estado intermediário.
 */
export function useTodayTrip(routeId: string | undefined) {
  return useQuery({
    queryKey: ["driver", "routes", routeId, "trip-today"],
    queryFn: () => tripsApi.findTodayByRoute(routeId as string),
    enabled: Boolean(routeId),
    // Enquanto há uma viagem em andamento, outros papéis (gestor via
    // painel web) podem substituir motorista/veículo — refetch curto
    // mantém a tela do Motorista honesta sem precisar de WebSocket.
    refetchInterval: (query) =>
      query.state.data?.status === "EM_ANDAMENTO" || query.state.data?.status === "PAUSADA"
        ? 20_000
        : false,
  });
}

function invalidateTodayTrip(
  queryClient: ReturnType<typeof useQueryClient>,
  routeId: string | undefined,
): void {
  void queryClient.invalidateQueries({ queryKey: ["driver", "routes", routeId, "trip-today"] });
}

export function useStartTrip(routeId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: StartTripInput) => tripsApi.start(input),
    onSuccess: () => invalidateTodayTrip(queryClient, routeId),
  });
}

export function usePauseTrip(routeId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (tripId: string) => tripsApi.pause(tripId),
    onSuccess: () => invalidateTodayTrip(queryClient, routeId),
  });
}

export function useResumeTrip(routeId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (tripId: string) => tripsApi.resume(tripId),
    onSuccess: () => invalidateTodayTrip(queryClient, routeId),
  });
}

export function useFinishTrip(routeId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (tripId: string) => tripsApi.finish(tripId),
    onSuccess: () => invalidateTodayTrip(queryClient, routeId),
  });
}

/**
 * Próximas paradas com ETA recalculado (tarefa #99 — distância real +
 * ausência de aluno). Porta de `apps/web/src/features/trips/hooks/
 * use-trips.ts#useTripProximasEtas` (Frente L) — mesmo endpoint
 * (`tripsApi.getProximasEtas`) já usado pelo acompanhamento do
 * Responsável, faltava só o motorista/monitor ver a própria conta
 * enquanto dirige (Frente M).
 */
export function useTripProximasEtas(tripId: string | undefined) {
  return useQuery({
    queryKey: ["driver", "trips", tripId, "proximas-etas"],
    queryFn: () => tripsApi.getProximasEtas(tripId as string),
    enabled: Boolean(tripId),
    refetchInterval: tripId ? 30_000 : false,
  });
}

/** Checklist de embarque/desembarque (EMB-01/05 + DESEMB-01/03) — quem já embarcou/desembarcou hoje nesta viagem. */
export function useTripStudentEvents(tripId: string | undefined) {
  return useQuery({
    queryKey: ["driver", "trips", tripId, "student-events"],
    queryFn: () => tripsApi.listStudentEvents(tripId as string),
    enabled: Boolean(tripId),
    refetchInterval: tripId ? 20_000 : false,
  });
}

/**
 * Trilha completa de posições de uma viagem já encerrada (Frente 3 —
 * preview de rota em "Histórico", paridade com o Painel Web). Mesmo
 * endpoint (`GET /trips/:id/positions`, libera Motorista/Monitor) que
 * alimenta o mapa ao vivo — só chamado quando a viagem já está
 * `FINALIZADA`, sem polling.
 */
export function useTripPositions(tripId: string | undefined) {
  return useQuery({
    queryKey: ["driver", "trips", tripId, "positions"],
    queryFn: () => tripsApi.listPositions(tripId as string),
    enabled: Boolean(tripId),
  });
}

export function useAddStudentEvent(tripId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { studentId: string; tipo: "EMBARCOU" | "AUSENTE" | "DESEMBARCOU" }) =>
      tripsApi.addStudentEvent(tripId as string, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["driver", "trips", tripId, "student-events"],
      });
    },
  });
}
