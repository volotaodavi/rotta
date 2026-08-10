import { useQuery } from "@tanstack/react-query";

import { routesApi, studentsApi } from "@/lib/api-client";

/**
 * Rotas do Motorista/Monitor (Prompt Mestre da Rotta, Seções 5/9 — "não
 * deve virar um painel administrativo"). `routesApi.list` já devolve só
 * as rotas atribuídas a este usuário (`RoutesService.list` escopa por
 * `motoristaPadraoId`/`monitorPadraoId` quando o ator tem esses papéis
 * — nunca a operação inteira da empresa).
 */
export function useMinhasRotas() {
  return useQuery({
    queryKey: ["driver", "routes"],
    queryFn: () => routesApi.list({ status: "ATIVA", pageSize: 50 }),
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

/** Nome do aluno para exibir em cada parada — cada linha busca o próprio, mesmo padrão de `transporte-inicio-screen.tsx#DetalhesContrato`. */
export function useStudent(studentId: string | undefined) {
  return useQuery({
    queryKey: ["students", studentId],
    queryFn: () => studentsApi.getById(studentId as string),
    enabled: Boolean(studentId),
  });
}
