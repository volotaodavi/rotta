"use client";

import { useQuery } from "@tanstack/react-query";

import { routesApi } from "@/lib/api-client";

/**
 * Rotas do Motorista/Monitor autônomo/MEI no Painel Web (Frente G,
 * "Modo Ação") — porta exata de `apps/mobile/src/features/driver/
 * hooks/use-driver-routes.ts` (mesmos hooks TanStack Query em cima do
 * mesmo `@rotta/api-client`, só o import local muda). `routesApi.list`
 * já devolve só as rotas atribuídas a este usuário
 * (`RoutesService.list` escopa por `motoristaPadraoId`/`monitorPadraoId`
 * quando o ator tem esses papéis). Nome do aluno em cada parada usa
 * `useStudent` já existente em `features/students/hooks/use-students.ts`
 * — não duplicado aqui.
 */
export function useMinhasRotas(enabled = true) {
  return useQuery({
    queryKey: ["driver", "routes"],
    queryFn: () => routesApi.list({ status: "ATIVA", pageSize: 50 }),
    enabled,
  });
}

export function useRouteStops(routeId: string | undefined) {
  return useQuery({
    queryKey: ["driver", "routes", routeId, "stops"],
    queryFn: () => routesApi.listStops(routeId as string),
    enabled: Boolean(routeId),
  });
}

export function useRouteStudents(routeId: string | undefined) {
  return useQuery({
    queryKey: ["driver", "routes", routeId, "students"],
    queryFn: () => routesApi.listStudents(routeId as string),
    enabled: Boolean(routeId),
  });
}
