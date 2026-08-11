"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { CreateStudentInput, ListStudentsParams, UpdateStudentInput } from "@rotta/api-client";

import { studentsApi } from "@/lib/api-client";

/**
 * Hooks de dados do módulo Alunos (Painel Web — Responsável), mesmo
 * padrão de `use-schools.ts`. `Student` é propriedade exclusiva do
 * Responsável autenticado — o backend já escopa `list`/`getById` pelo
 * próprio `responsavelId` do token (nunca um parâmetro aqui, mesmo
 * princípio de `StudentsService`, Dossiê 13 §"CADASTRO DO ALUNO").
 */
export function useStudentsList(params: ListStudentsParams = {}) {
  return useQuery({
    queryKey: ["students", params],
    queryFn: () => studentsApi.list(params),
  });
}

export function useStudent(id: string | undefined) {
  return useQuery({
    queryKey: ["students", id],
    queryFn: () => studentsApi.getById(id as string),
    enabled: Boolean(id),
  });
}

export function useCreateStudent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateStudentInput) => studentsApi.create(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["students"] });
    },
  });
}

export function useUpdateStudent(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateStudentInput) => studentsApi.update(id, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["students", id] });
      void queryClient.invalidateQueries({ queryKey: ["students"] });
    },
  });
}

export function useDeleteStudent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => studentsApi.remove(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["students"] });
    },
  });
}
