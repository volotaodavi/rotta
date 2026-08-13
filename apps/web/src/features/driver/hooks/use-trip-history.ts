"use client";

import { useQueries } from "@tanstack/react-query";

import type { Route, Trip } from "@rotta/api-client";

import { tripsApi } from "@/lib/api-client";

export interface TripHistoryEntry {
  trip: Trip;
  routeNome: string;
}

/**
 * Histórico de viagens do motorista/monitor (Frente K, página
 * "Atividades" — inspirada na aba "Activities" da imagem de referência
 * enviada pelo usuário, adaptada ao que a Rotta realmente tem: aqui não
 * existe "corrida futura agendada" como no app de referência, viagens
 * nascem no dia (`TripsService.start`) — por isso as abas da tela final
 * são só o que é honesto mostrar: Todas/Concluídas/Canceladas).
 *
 * `tripsApi.listByRoute` já existe (histórico por rota, tarefa #100) mas
 * nunca tinha uma tela própria no Painel Web — só era chamado
 * implicitamente via `findTodayByRoute`. Este hook busca o histórico de
 * TODAS as rotas do motorista/monitor em paralelo (`useQueries`, mesmo
 * padrão de `useGpsForStudents`) e devolve uma lista única já ordenada
 * por data, mais recente primeiro — a pessoa não escolhe "de qual rota"
 * quer ver o histórico, ela só tem uma vida operacional.
 */
export function useTripHistory(rotas: Pick<Route, "id" | "nome">[]): {
  isLoading: boolean;
  data: TripHistoryEntry[];
} {
  return useQueries({
    queries: rotas.map((rota) => ({
      queryKey: ["driver", "routes", rota.id, "trip-history"],
      queryFn: () => tripsApi.listByRoute(rota.id, 1, 50),
    })),
    combine: (results) => ({
      isLoading: results.some((r) => r.isLoading),
      data: results
        .flatMap((r, index) => {
          const rota = rotas[index];
          if (!r.data || !rota) return [];
          return r.data.items.map((trip): TripHistoryEntry => ({ trip, routeNome: rota.nome }));
        })
        .sort((a, b) => b.trip.data.localeCompare(a.trip.data)),
    }),
  });
}
