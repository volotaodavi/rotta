import { useQuery } from "@tanstack/react-query";

import { tripsApi } from "@/lib/api-client";

/** Histórico de viagens da rota do Motorista/Monitor (Prompt Mestre, Seção 7) — `TripsController` agora permite Motorista/Monitor lerem o histórico da PRÓPRIA rota (`RoutesService.findByIdOrThrow` já restringe o acesso por registro). */
export function useRouteTripHistory(routeId: string | undefined) {
  return useQuery({
    queryKey: ["driver", "routes", routeId, "trip-history"],
    queryFn: () => tripsApi.listByRoute(routeId as string, 1, 30),
    enabled: Boolean(routeId),
  });
}
