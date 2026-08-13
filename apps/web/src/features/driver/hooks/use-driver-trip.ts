"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { StartTripInput } from "@rotta/api-client";

import { tripsApi } from "@/lib/api-client";

/**
 * Ciclo de vida da viagem do dia, do lado do Motorista/Monitor
 * autônomo/MEI no Painel Web (Frente G, "Modo Ação") — porta de
 * `apps/mobile/src/features/driver/hooks/use-driver-trip.ts`.
 * `findTodayByRoute` devolve a viagem de hoje independente do status
 * (ou `null`) — a tela decide o que mostrar a partir do `status` real,
 * nunca inventa um estado intermediário. Checklist de embarque/
 * desembarque usa `useTripStudentEvents` já existente em
 * `features/trips/hooks/use-trips.ts` — não duplicado aqui.
 */
export function useTodayTrip(routeId: string | undefined) {
  return useQuery({
    queryKey: ["driver", "routes", routeId, "trip-today"],
    queryFn: () => tripsApi.findTodayByRoute(routeId as string),
    enabled: Boolean(routeId),
    // Enquanto há uma viagem em andamento, outros papéis (gestor via
    // painel web) podem substituir motorista/veículo — refetch curto
    // mantém a tela honesta sem precisar de WebSocket.
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

export function useAddStudentEvent(tripId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { studentId: string; tipo: "EMBARCOU" | "AUSENTE" | "DESEMBARCOU" }) =>
      tripsApi.addStudentEvent(tripId as string, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["trips", tripId, "student-events"] });
    },
  });
}
