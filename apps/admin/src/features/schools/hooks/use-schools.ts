"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { ListSchoolsParams, SchoolStatus } from "@rotta/api-client";

import { schoolsApi } from "@/lib/api-client";


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
