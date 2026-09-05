"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { CreateSchoolInput, ListSchoolsParams, SchoolStatus } from "@rotta/api-client";

import { geoApi, schoolsApi } from "@/lib/api-client";

/**
 * Hooks de dados do módulo Escolas (visão cross-tenant do Admin Rotta) —
 * mesmo padrão de `use-vehicles.ts`. Apenas leitura + moderação de status
 * + vínculos, já que o Admin Rotta não tem tenant próprio (não cadastra
 * escolas nem se vincula como empresa).
 */
export function useSchoolsList(params: ListSchoolsParams) {
  return useQuery({
    queryKey: ["schools", params],
    queryFn: () => schoolsApi.list(params),
  });
}

/**
 * Cadastro de escola pontual, direto de dentro do fluxo "Novo aluno"
 * (pedido do usuário 02/09/2026, item 2: "vincular escola no fluxo de
 * criação de aluno" — antes, se a escola não existisse no catálogo, o
 * Admin não tinha como cadastrá-la sem sair do formulário). Backend já
 * liberava `POST /schools` pra `ADMIN_ROTTA`/`EMPRESA`/`GESTOR`
 * (`MANAGE_ROLES` em `schools.controller.ts`) — gap era só a falta
 * dessa chamada no front.
 */
export function useCreateSchool() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateSchoolInput) => schoolsApi.create(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["schools"] });
    },
  });
}

export function useSchool(id: string) {
  return useQuery({
    queryKey: ["schools", id],
    queryFn: () => schoolsApi.getById(id),
    enabled: Boolean(id),
  });
}

export function useSchoolDashboard(companyId?: string) {
  return useQuery({
    queryKey: ["schools", "dashboard", companyId],
    queryFn: () => schoolsApi.getDashboard(companyId),
  });
}

export function useSchoolAuditLogs(id: string, page = 1, pageSize = 20) {
  return useQuery({
    queryKey: ["schools", id, "audit-logs", page, pageSize],
    queryFn: () => schoolsApi.listAuditLogs(id, page, pageSize),
    enabled: Boolean(id),
  });
}

export function useSchoolCompanyLinks(id: string) {
  return useQuery({
    queryKey: ["schools", id, "company-links"],
    queryFn: () => schoolsApi.listCompanyLinks(id),
    enabled: Boolean(id),
  });
}

export function useUpdateSchoolStatus(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (status: SchoolStatus) => schoolsApi.updateStatus(id, status),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["schools", id] });
      void queryClient.invalidateQueries({ queryKey: ["schools"] });
    },
  });
}

/**
 * Troca de status EM MASSA (pedido do usuário: "as escolas que
 * estiverem com o status de 'em análise', passe todas as escolas para
 * 'ativa'") — um único `PATCH`, nunca um loop escola por escola (o
 * catálogo nacional importado do INEP passa de 150 mil linhas).
 */
export function useBulkUpdateSchoolStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ fromStatus, toStatus }: { fromStatus: SchoolStatus; toStatus: SchoolStatus }) =>
      schoolsApi.bulkUpdateStatus(fromStatus, toStatus),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["schools"] });
    },
  });
}

/**
 * Education Sync Agent (Dossiê 14) — sem disparar isso pelo menos uma
 * vez em produção, o catálogo `School` (compartilhado, sem
 * `companyId`) fica vazio pra toda a plataforma: nenhuma empresa
 * consegue vincular aluno a escola nem ver nada no mapa de Escolas.
 * `onSuccess` NÃO invalida nada diretamente — o job só foi publicado na
 * fila (202 Accepted); `useInepSyncStatus` abaixo, com `refetchInterval`
 * próprio, é quem detecta quando o worker termina.
 */
export function useSyncInep() {
  return useMutation({
    mutationFn: (ano: number) => geoApi.syncInep(ano),
  });
}

/**
 * Última execução da sincronização INEP (sucesso ou falha) — fecha o
 * gap "o resultado não aparece aqui ainda, só nos logs do servidor"
 * (comentário antigo de `(admin)/escolas/page.tsx`). `refetchInterval`
 * curto só enquanto a tela estiver aberta (React Query já pausa fora de
 * foco) — nunca faz sentido um polling agressivo pra algo que muda no
 * máximo uma vez por clique/mês.
 */
export function useInepSyncStatus() {
  return useQuery({
    queryKey: ["schools", "inep-sync-status"],
    queryFn: () => geoApi.getInepSyncStatus(),
    refetchInterval: 15000,
  });
}
