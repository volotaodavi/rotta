"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { CreateStudentForCompanyInput } from "@rotta/api-client";

import { studentsApi } from "@/lib/api-client";


/**
 * Hooks do módulo Alunos, visão Admin Rotta (pedido do usuário
 * 02/09/2026: "empresas > alunos > cadastramos os alunos... salvamos e
 * pronto"). `useCompanyStudents` filtra por `companyId` — sem isso o
 * Admin (sem tenant próprio) veria alunos de TODAS as empresas
 * misturados (`StudentsService.list`).
 */
export function useCompanyStudents(companyId: string) {
  return useQuery({
    queryKey: ["students", "company", companyId],
    queryFn: () => studentsApi.list({ companyId, pageSize: 100 }),
    enabled: Boolean(companyId),
  });
}

export function useCreateStudentForCompany(companyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Omit<CreateStudentForCompanyInput, "companyId">) =>
      studentsApi.createForCompany({ ...input, companyId }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["students", "company", companyId] });
    },
  });
}
