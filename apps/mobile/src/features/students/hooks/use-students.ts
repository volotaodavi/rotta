import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type {
  CreateStudentInput,
  ListStudentsParams,
  UpdateStudentInput,
  UpsertStudentAddressOverrideInput,
} from "@rotta/api-client";

import { studentsApi } from "@/lib/api-client";

/**
 * Hooks de dados do módulo Alunos no app (Frente 2 — "Meus Alunos"
 * completo do Responsável) — mirror exato de
 * `apps/web/src/features/students/hooks/use-students.ts`. `Student` é
 * propriedade exclusiva do Responsável autenticado — o backend já
 * escopa `list`/`getById` pelo próprio `responsavelId` do token.
 *
 * `useStudentsList`/`useStudent`/`useStudentDailyAbsence`/
 * `useMarkStudentAbsentToday`/`useRemoveStudentAbsentToday` já
 * existiam soltos em `features/marketplace/hooks/use-students.ts`
 * (usados no seletor de "Solicitar Transporte" e no card de ausência) —
 * esse arquivo agora só reexporta daqui, sem duplicar lógica.
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

/** Calendário "Endereço do dia" — busca uma janela de datas por vez, nunca a vida inteira do aluno. */
export function useStudentAddressOverrides(
  studentId: string | undefined,
  range: { from?: string; to?: string } = {},
) {
  return useQuery({
    queryKey: ["students", studentId, "address-overrides", range],
    queryFn: () => studentsApi.listAddressOverrides(studentId as string, range),
    enabled: Boolean(studentId),
  });
}

export function useUpsertStudentAddressOverride(studentId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpsertStudentAddressOverrideInput) =>
      studentsApi.upsertAddressOverride(studentId, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["students", studentId, "address-overrides"],
      });
    },
  });
}

export function useRemoveStudentAddressOverride(studentId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (overrideId: string) => studentsApi.removeAddressOverride(studentId, overrideId),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["students", studentId, "address-overrides"],
      });
    },
  });
}

/**
 * "Meu filho não vai hoje" (Epic C) — marcado ANTES da viagem do dia
 * começar (o backend rejeita depois, com mensagem clara); nunca
 * bloqueia o uso do app.
 */
export function useStudentDailyAbsence(studentId: string | undefined) {
  return useQuery({
    queryKey: ["students", studentId, "ausencia-hoje"],
    queryFn: () => studentsApi.getAbsentToday(studentId as string),
    enabled: Boolean(studentId),
  });
}

export function useMarkStudentAbsentToday(studentId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (motivo?: string) => studentsApi.markAbsentToday(studentId, { motivo }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["students", studentId, "ausencia-hoje"] });
    },
  });
}

export function useRemoveStudentAbsentToday(studentId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => studentsApi.removeAbsentToday(studentId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["students", studentId, "ausencia-hoje"] });
    },
  });
}
