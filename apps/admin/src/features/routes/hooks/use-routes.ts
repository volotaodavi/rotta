"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type {
  AddRouteStudentInput,
  CreateRouteInput,
  CreateRouteStopInput,
} from "@rotta/api-client";

import { marketplaceApi, routesApi } from "@/lib/api-client";


/**
 * Hooks do módulo Rotas, visão Admin Rotta (pedido do usuário
 * 02/09/2026: "empresas > alunos > ... rotas/endereços residenciais").
 * Backend já suportava tudo pro Admin (`MANAGE_ROLES` já incluía
 * `ADMIN_ROTTA` pra paradas/alunos) — só `create` da própria rota
 * exigia Empresa/Gestor, corrigido junto com este front.
 */
export function useCompanyRoutes(companyId: string) {
  return useQuery({
    queryKey: ["routes", "company", companyId],
    queryFn: () => routesApi.list({ companyId, pageSize: 100 }),
    enabled: Boolean(companyId),
  });
}

export function useCreateRoute(companyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Omit<CreateRouteInput, "companyId">) =>
      // `companyId` não faz parte de `CreateRouteInput` no tipo público
      // (Empresa/Gestor nunca o envia) — só o backend aceita esse campo
      // extra quando o ator é Admin Rotta; `as` aqui é seguro porque o
      // corpo vira JSON de qualquer forma.
      routesApi.create({ ...input, companyId } as CreateRouteInput),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["routes", "company", companyId] });
    },
  });
}

export function useRouteStops(routeId: string | null) {
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

export function useRouteStudentsDetalhado(routeId: string | null) {
  return useQuery({
    queryKey: ["routes", routeId, "students-detalhado"],
    queryFn: () => routesApi.listStudentsDetalhado(routeId as string),
    enabled: Boolean(routeId),
  });
}

export function useAddRouteStudent(routeId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: AddRouteStudentInput) => routesApi.addStudent(routeId, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["routes", routeId, "students-detalhado"],
      });
    },
  });
}

/**
 * Contrato ATIVO de um aluno específico com a empresa — resolvido no
 * cliente (busca a lista de contratos da empresa e filtra por
 * `studentId`) porque `GET /marketplace/contracts` ainda não tem um
 * filtro dedicado por aluno. `AddRouteStudentInput.contractId` exige
 * isso: vincular à rota é sempre pelo Contrato, nunca pelo Student
 * direto.
 */
export function useStudentContract(companyId: string, studentId: string | null) {
  return useQuery({
    queryKey: ["marketplace", "contracts", "company", companyId, "student", studentId],
    queryFn: async () => {
      const result = await marketplaceApi.listContracts({ pageSize: 100 });
      return result.items.find((c) => c.studentId === studentId) ?? null;
    },
    enabled: Boolean(companyId) && Boolean(studentId),
  });
}
