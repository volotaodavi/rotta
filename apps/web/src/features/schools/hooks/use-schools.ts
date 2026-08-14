"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type {
  CreateSchoolAccessPointInput,
  CreateSchoolInput,
  ListSchoolsParams,
  QuickRegisterSchoolInput,
  SchoolStatus,
  SuggestSchoolsParams,
  UpdateSchoolAccessPointInput,
  UpdateSchoolInput,
} from "@rotta/api-client";

import { geoApi, schoolsApi } from "@/lib/api-client";

/**
 * Hooks de dados do módulo Escolas (Painel Web — Empresa/Gestor
 * gerenciando o catálogo compartilhado de escolas), mesmo padrão de
 * `use-vehicles.ts`. Diferencial: `linkCompany`/`unlinkCompany` (o
 * vínculo empresa<->escola, não a Escola em si, é o dado de tenant).
 */
export function useSchoolsList(params: ListSchoolsParams) {
  return useQuery({
    queryKey: ["schools", params],
    queryFn: () => schoolsApi.list(params),
  });
}

/**
 * Autocomplete de escola tolerante a erro de digitação, com sugestão por
 * proximidade (pedido do usuário: "mesmo escrevendo errado... vai dar
 * uma sugestão de escola baseada no nome e localização") — usado pelo
 * cadastro de Aluno (`alunos/novo/page.tsx`) em vez de `useSchoolsList`
 * na caixa de busca. `enabled` só liga com 2+ caracteres (mesmo limite
 * do backend, `SuggestSchoolsQueryDto.q`), evitando uma sugestão vazia
 * ("qualquer coisa parece com tudo") logo na primeira letra.
 */
export function useSuggestSchools(params: SuggestSchoolsParams) {
  return useQuery({
    queryKey: ["schools", "sugestoes", params],
    queryFn: () => schoolsApi.sugerir(params),
    enabled: params.q.trim().length >= 2,
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

export function useCheckSchoolDuplicates(nomeOficial: string, cidade: string, estado: string) {
  return useQuery({
    queryKey: ["schools", "check-duplicates", nomeOficial, cidade, estado],
    queryFn: () => schoolsApi.checkPossibleDuplicates(nomeOficial, cidade, estado),
    enabled: Boolean(nomeOficial && cidade && estado),
  });
}

export function useCreateSchool() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateSchoolInput) => schoolsApi.create(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["schools"] });
    },
  });
}

/**
 * Autocadastro rápido de escola (Geocoding AI Agent, `POST /geo/
 * schools/quick-register`) — pedido do usuário: "não aparece escolas
 * para clicar, nem busca rápida para ver se a escola existe". Usado
 * pelo cadastro de Aluno quando a busca no catálogo (`useSchoolsList`)
 * não encontra nada — a escola nasce `EM_ANALISE`, mas já pode ser
 * selecionada nesta mesma hora.
 */
export function useQuickRegisterSchool() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: QuickRegisterSchoolInput) => geoApi.quickRegisterSchool(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["schools"] });
    },
  });
}

export function useUpdateSchool(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateSchoolInput) => schoolsApi.update(id, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["schools", id] });
      void queryClient.invalidateQueries({ queryKey: ["schools"] });
    },
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

export function useDeleteSchool() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => schoolsApi.remove(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["schools"] });
    },
  });
}

export function useImportSchools() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ format, file }: { format: "csv" | "excel" | "json"; file: File }) =>
      schoolsApi.importFile(format, file),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["schools"] });
    },
  });
}

export function useSchoolAuditLogs(id: string, page = 1, pageSize = 20) {
  return useQuery({
    queryKey: ["schools", id, "audit-logs", page, pageSize],
    queryFn: () => schoolsApi.listAuditLogs(id, page, pageSize),
    enabled: Boolean(id),
  });
}

// --- Portões e Pontos de Embarque ---

export function useSchoolAccessPoints(id: string) {
  return useQuery({
    queryKey: ["schools", id, "access-points"],
    queryFn: () => schoolsApi.listAccessPoints(id),
    enabled: Boolean(id),
  });
}

export function useCreateSchoolAccessPoint(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateSchoolAccessPointInput) => schoolsApi.createAccessPoint(id, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["schools", id, "access-points"] });
    },
  });
}

export function useUpdateSchoolAccessPoint(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ pointId, input }: { pointId: string; input: UpdateSchoolAccessPointInput }) =>
      schoolsApi.updateAccessPoint(id, pointId, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["schools", id, "access-points"] });
    },
  });
}

export function useRemoveSchoolAccessPoint(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (pointId: string) => schoolsApi.removeAccessPoint(id, pointId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["schools", id, "access-points"] });
    },
  });
}

// --- Vínculo Empresa<->Escola ---

export function useSchoolCompanyLinks(id: string) {
  return useQuery({
    queryKey: ["schools", id, "company-links"],
    queryFn: () => schoolsApi.listCompanyLinks(id),
    enabled: Boolean(id),
  });
}

export function useLinkSchoolCompany(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (companyId?: string) => schoolsApi.linkCompany(id, companyId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["schools", id, "company-links"] });
    },
  });
}

export function useUnlinkSchoolCompany(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (linkId: string) => schoolsApi.unlinkCompany(id, linkId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["schools", id, "company-links"] });
    },
  });
}
