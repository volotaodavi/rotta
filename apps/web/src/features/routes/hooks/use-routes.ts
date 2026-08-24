"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type {
  AddRouteStudentInput,
  CreateRouteInput,
  CreateRouteStopInput,
  ListRoutesParams,
  UpdateRouteInput,
  UpdateRouteStopInput,
} from "@rotta/api-client";

import { routesApi } from "@/lib/api-client";

/**
 * Hooks de dados do novo fluxo de Rotas (pedido do usuário: "crie uma
 * aba para 'Criar rota'... esquece o fluxo anterior") — `/rotas`,
 * `/rotas/novo`, `/rotas/[id]`, `/rotas/[id]/executar`. A API de Rotas
 * (`RoutesController`) nunca mudou nas remoções anteriores desta
 * sessão — só a UI que a chamava foi apagada e agora é reconstruída do
 * zero. Mesmo padrão de `use-schools.ts`/`use-vehicles.ts`.
 *
 * FORA DE ESCOPO (decisão consciente do plano aprovado): nenhum hook
 * de sugestão de otimização via Rotta Route AI aqui — o roteiro do
 * usuário não pede isso desta vez.
 */
export function useRoutesList(params: ListRoutesParams = {}) {
  return useQuery({
    queryKey: ["routes", params],
    queryFn: () => routesApi.list(params),
  });
}

export function useRoute(id: string | undefined) {
  return useQuery({
    queryKey: ["routes", id],
    queryFn: () => routesApi.getById(id as string),
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

/**
 * Toda rota nasce `status: PAUSADA` (default do backend) e o backend
 * já vira `ATIVA` sozinho assim que o primeiro aluno é vinculado
 * (`RoutesService.addStudent`) — `useUpdateRoute` existe pra edição
 * manual dos demais campos (nome/turno/dias/padrões), não pra "ativar".
 */
export function useUpdateRoute(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateRouteInput) => routesApi.update(id, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["routes"] });
    },
  });
}

export function useRouteStops(routeId: string | undefined) {
  return useQuery({
    queryKey: ["routes", routeId, "stops"],
    queryFn: () => routesApi.listStops(routeId as string),
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

export function useUpdateRouteStop(routeId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ stopId, input }: { stopId: string; input: UpdateRouteStopInput }) =>
      routesApi.updateStop(routeId, stopId, input),
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

export function useRouteStudents(routeId: string | undefined) {
  return useQuery({
    queryKey: ["routes", routeId, "students"],
    queryFn: () => routesApi.listStudents(routeId as string),
    enabled: Boolean(routeId),
  });
}

export function useAddRouteStudent(routeId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: AddRouteStudentInput) => routesApi.addStudent(routeId, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["routes", routeId, "students"] });
      // Vincular o primeiro aluno a uma rota PAUSADA com parada já
      // ativa automaticamente no backend (`RoutesService.addStudent`)
      // — invalida `["routes"]` inteiro (detalhe + listagem) pra o
      // badge de status refletir a troca sem precisar de refresh manual.
      void queryClient.invalidateQueries({ queryKey: ["routes"] });
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
