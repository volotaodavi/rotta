import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { ListRoutesParams, UpdateRouteInput } from "@rotta/api-client";

import { routesApi } from "@/lib/api-client";

/**
 * Hooks de Rotas pro lado da Empresa/Gestor (Frente 4a — Rotas,
 * Empresa/Gestor reduzida) — mesmos endpoints já usados por
 * `apps/web/src/app/(dashboard)/rotas/**`.
 */
const ROUTES_QUERY_KEY = ["empresa", "routes"] as const;

export function useRoutesList(params: ListRoutesParams = { pageSize: 100 }) {
  return useQuery({
    queryKey: [...ROUTES_QUERY_KEY, "list", params],
    queryFn: () => routesApi.list(params),
  });
}

export function useRoute(id: string | undefined) {
  return useQuery({
    queryKey: [...ROUTES_QUERY_KEY, id],
    queryFn: () => routesApi.getById(id as string),
    enabled: Boolean(id),
  });
}

export function useUpdateRoute(id: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateRouteInput) => routesApi.update(id as string, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ROUTES_QUERY_KEY });
    },
  });
}

export function useRouteStops(id: string | undefined) {
  return useQuery({
    queryKey: [...ROUTES_QUERY_KEY, id, "stops"],
    queryFn: () => routesApi.listStops(id as string),
    enabled: Boolean(id),
  });
}

/** Detalhado (nomes prontos: aluno/escola/responsável) — evita N+1 de uma busca por linha. */
export function useRouteStudentsDetalhado(id: string | undefined) {
  return useQuery({
    queryKey: [...ROUTES_QUERY_KEY, id, "students"],
    queryFn: () => routesApi.listStudentsDetalhado(id as string),
    enabled: Boolean(id),
  });
}
