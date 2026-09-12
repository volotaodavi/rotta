import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type {
  AddRouteStudentInput,
  CreateRouteInput,
  CreateRouteStopInput,
  ListRoutesParams,
  UpdateRouteInput,
} from "@rotta/api-client";

import { marketplaceApi, routesApi, studentsApi } from "@/lib/api-client";

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

/** Frente 4b — criação de rota (nome/turno/dias, sem wizard multi-tela — ver `empresa-rota-nova-screen.tsx`). */
export function useCreateRoute() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateRouteInput) => routesApi.create(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ROUTES_QUERY_KEY });
    },
  });
}

export function useAddRouteStop(id: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateRouteStopInput) => routesApi.addStop(id as string, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [...ROUTES_QUERY_KEY, id, "stops"] });
    },
  });
}

export function useAddRouteStudent(id: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: AddRouteStudentInput) => routesApi.addStudent(id as string, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [...ROUTES_QUERY_KEY, id, "students"] });
    },
  });
}

export function useRemoveRouteStudent(id: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (routeStudentId: string) => routesApi.removeStudent(id as string, routeStudentId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [...ROUTES_QUERY_KEY, id, "students"] });
    },
  });
}

/**
 * Candidatos a vincular na rota (Frente 4b) — contratos `ATIVO` ainda
 * sem vínculo nesta rota, cruzados com o nome do aluno. Mesma lógica de
 * `apps/web/.../rotas/[id]/_components/students-section.tsx`, mais
 * barata que a Web: busca `studentsApi.list` uma vez só (mapa por id)
 * em vez de um `useStudent` por linha.
 */
export function useRouteStudentCandidates() {
  return useQuery({
    queryKey: ["empresa", "route-student-candidates"],
    queryFn: async () => {
      const [contratos, alunos] = await Promise.all([
        marketplaceApi.listContracts({ pageSize: 100 }),
        studentsApi.list({ pageSize: 100 }),
      ]);
      const nomesPorAlunoId = new Map(alunos.items.map((aluno) => [aluno.id, aluno.nome]));
      return contratos.items
        .filter((contrato) => contrato.status === "ATIVO")
        .map((contrato) => ({
          contractId: contrato.id,
          studentId: contrato.studentId,
          studentNome: nomesPorAlunoId.get(contrato.studentId) ?? "Aluno",
        }));
    },
  });
}
