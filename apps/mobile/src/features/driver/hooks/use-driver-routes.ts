import { useQueries, useQuery } from "@tanstack/react-query";

import type { RouteStudentDetalhado } from "@rotta/api-client";

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

/**
 * `useRouteStudents` + nomes legíveis (pedido do usuário: card
 * pré-início da viagem — "aparecerá as informações... nome dos alunos,
 * escolas, horário, bairros, responsáveis").
 */
export function useRouteStudentsDetalhado(routeId: string | undefined) {
  return useQuery({
    queryKey: ["driver", "routes", routeId, "students", "detalhado"],
    queryFn: () => routesApi.listStudentsDetalhado(routeId as string),
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

export interface AlunoDeRota extends RouteStudentDetalhado {
  routeId: string;
  routeNome: string;
}

/**
 * Alunos de TODAS as rotas ativas do Motorista/Monitor (Frente 4 —
 * pedido do usuário 11/09/2026: "Monitor: alunos + perfil + escolas").
 * Antes só os alunos da rota da viagem em andamento apareciam
 * (`inicio-screen.tsx`, escopados a uma única `rota.id`) — este hook
 * busca `listStudentsDetalhado` de cada rota em `useMinhasRotas` em
 * paralelo e devolve uma lista única (mesmo padrão de
 * `use-trip-history.ts` na Web, `useQueries` + `combine`), já que a
 * pessoa não escolhe "de qual rota" quer ver os alunos — ela só tem uma
 * lista de alunos que atende no dia a dia. Read-only: Monitor não
 * cadastra/edita aluno (isso é do Responsável ou da Empresa/Gestor).
 */
export function useAlunosDasMinhasRotas(): { isLoading: boolean; data: AlunoDeRota[] } {
  const { data: rotas, isLoading: isLoadingRotas } = useMinhasRotas();
  const items = rotas?.items ?? [];

  return useQueries({
    queries: items.map((rota) => ({
      queryKey: ["driver", "routes", rota.id, "students", "detalhado"],
      queryFn: () => routesApi.listStudentsDetalhado(rota.id),
    })),
    combine: (results) => ({
      isLoading: isLoadingRotas || results.some((r) => r.isLoading),
      data: results
        .flatMap((r, index) => {
          const rota = items[index];
          if (!r.data || !rota) return [];
          return r.data.map((aluno): AlunoDeRota => ({
            ...aluno,
            routeId: rota.id,
            routeNome: rota.nome,
          }));
        })
        .sort((a, b) => (a.studentNome ?? "").localeCompare(b.studentNome ?? "")),
    }),
  });
}
