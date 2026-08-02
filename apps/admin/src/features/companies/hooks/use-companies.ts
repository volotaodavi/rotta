"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type {
  CreateCompanyInput,
  ListCompaniesParams,
  UpdateCompanyInput,
} from "@rotta/api-client";

import { companiesApi } from "@/lib/api-client";


/** Hooks de dados do módulo Empresas (Dossie 23, Secao 2.2 — TanStack Query como fonte de estado de servidor). */
export function useCompaniesList(params: ListCompaniesParams) {
  return useQuery({
    queryKey: ["companies", params],
    queryFn: () => companiesApi.list(params),
  });
}

export function useCompany(id: string) {
  return useQuery({
    queryKey: ["companies", id],
    queryFn: () => companiesApi.getById(id),
  });
}

export function useCompanyDashboard(id: string) {
  return useQuery({
    queryKey: ["companies", id, "dashboard"],
    queryFn: () => companiesApi.getDashboard(id),
  });
}

export function useCreateCompany() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateCompanyInput) => companiesApi.create(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["companies"] });
    },
  });
}

export function useUpdateCompany(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateCompanyInput) => companiesApi.update(id, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["companies", id] });
      void queryClient.invalidateQueries({ queryKey: ["companies"] });
    },
  });
}

export function useSuspendCompany(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (motivo: string) => companiesApi.suspend(id, motivo),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["companies", id] });
      void queryClient.invalidateQueries({ queryKey: ["companies"] });
    },
  });
}

export function useReactivateCompany(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => companiesApi.reactivate(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["companies", id] });
      void queryClient.invalidateQueries({ queryKey: ["companies"] });
    },
  });
}
