"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type {
  AddRouteStudentInput,
  CreateRouteInput,
  CreateRouteStopInput,
  ListRoutesParams,
  UpdateRouteInput,
} from "@rotta/api-client";

import { rottaAiApi, routesApi } from "@/lib/api-client";

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

/**
 * Pedido do usuário: "na aba 'minha rota', deverá ter todas as rotas."
 * Achado real: toda rota nasce `status: PAUSADA` (default do backend,
 * `Route.status @default(PAUSADA)`), e `useMinhasRotas`
 * (`apps/web/src/features/driver/hooks/use-driver-routes.ts`) só busca
 * `status: "ATIVA"` — uma rota recém-criada nunca aparecia em "Minha
 * Rota" pra ninguém, porque não existia NENHUM botão em lugar nenhum
 * do painel pra tirá-la de PAUSADA, mesmo o backend (`UpdateRouteDto.status`)
 * já aceitando essa troca. `useUpdateRoute` fecha esse buraco.
 */
export function useUpdateRoute(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateRouteInput) => routesApi.update(id, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["routes"] });
      void queryClient.invalidateQueries({ queryKey: ["driver", "routes"] });
    },
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
      // Vincular o primeiro aluno a uma rota PAUSADA com parada já
      // ativa a automaticamente no backend (`RoutesService.addStudent`
      // — pedido do usuário: "após selecionar os alunos, salvar para
      // dar início"). `["routes"]` (sem mais nada) invalida tanto esta
      // rota (`useRoute`, `["routes", id]`) quanto a listagem
      // (`useRoutesList`, `["routes", params]`) — sem isso o badge de
      // status continuava mostrando "Pausada" até um refresh manual, a
      // mudança já tinha acontecido no banco, só não refletia na tela.
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

/**
 * "Rotta Route AI" — pedido do usuário: "as IAs de localização irão
 * traçar as rotas (por ordem de proximidade) no OPENSTREET". Só sugere
 * (ROT-08: "a sugestão nunca altera a rota automaticamente") — por isso
 * é uma mutation disparada por um botão explícito ("Otimizar rota"), sem
 * `onSuccess` que invalide/altere nada; quem decide aplicar a nova ordem
 * é o Gestor, olhando a comparação, não este hook.
 */
export function useSuggestRouteOptimization(routeId: string) {
  return useMutation({
    mutationFn: () => rottaAiApi.suggestRouteOptimization({ routeId }),
  });
}
