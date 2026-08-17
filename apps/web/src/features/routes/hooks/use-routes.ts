"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type {
  AddRouteStudentInput,
  CreateRouteInput,
  CreateRouteStopInput,
  ListRoutesParams,
} from "@rotta/api-client";

import { routesApi } from "@/lib/api-client";


/**
 * Hooks de dados do módulo Rotas — auto-serviço de Empresa/Gestor
 * (`/rotas`, `/rotas/novo`, `/rotas/[id]`). Achado da auditoria (pedido
 * do usuário: "o responsável... deverá mostrar qual motorista está se
 * credenciando e de fato credenciar aquele motorista. Mostrando a rota
 * em tempo real"): a API de Rotas (`RoutesController`, Frente #92-108)
 * sempre existiu completa, mas NENHUMA tela em nenhuma plataforma
 * (web/admin/mobile) chamava `POST /routes`, `POST /routes/:id/stops`
 * ou `POST /routes/:id/students` — só a leitura (`useMinhasRotas`,
 * `use-driver-routes.ts`) existia. Sem isso, nenhum aluno linkado por
 * Contrato podia efetivamente entrar numa Rota, então nenhum motorista
 * "se credenciava" e a Rota nunca aparecia em tempo real pra ninguém.
 * Mesmo padrão de `use-schools.ts`/`use-vehicles.ts`.
 */
export function useRoutesList(params: ListRoutesParams) {
  return useQuery({
    queryKey: ["routes", params],
    queryFn: () => routesApi.list(params),
  });
}

export function useRoute(id: string) {
  return useQuery({
    queryKey: ["routes", id],
    queryFn: () => routesApi.getById(id),
    enabled: Boolean(id),
  });
}

export function useCreateRoute() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateRouteInput) => routesApi.create(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["routes"] });
    },
  });
}

export function useRouteStops(routeId: string) {
  return useQuery({
    queryKey: ["routes", routeId, "stops"],
    queryFn: () => routesApi.listStops(routeId),
    enabled: Boolean(routeId),
  });
}

export function useAddRouteStop(routeId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateRouteStopInput) => routesApi.addStop(routeId, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["routes", routeId, "stops"] });
    },
  });
}

export function useRemoveRouteStop(routeId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (stopId: string) => routesApi.removeStop(routeId, stopId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["routes", routeId, "stops"] });
    },
  });
}

export function useRouteStudents(routeId: string) {
  return useQuery({
    queryKey: ["routes", routeId, "students"],
    queryFn: () => routesApi.listStudents(routeId),
    enabled: Boolean(routeId),
  });
}

export function useAddRouteStudent(routeId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: AddRouteStudentInput) => routesApi.addStudent(routeId, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["routes", routeId, "students"] });
    },
  });
}

export function useRemoveRouteStudent(routeId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (routeStudentId: string) => routesApi.removeStudent(routeId, routeStudentId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["routes", routeId, "students"] });
    },
  });
}
