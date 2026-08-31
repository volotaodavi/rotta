import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { studentsApi } from "@/lib/api-client";

/** Alunos do próprio Responsável (para o seletor da tela "Solicitar Transporte"). */
export function useStudentsList() {
  return useQuery({
    queryKey: ["students"],
    queryFn: () => studentsApi.list({ pageSize: 50 }),
  });
}

/**
 * Um aluno específico (Frente 10 — nome pro cartão de "ausência de
 * hoje" em `AcompanhamentoSection`, que só tinha `contrato.studentId`).
 */
export function useStudent(studentId: string | undefined) {
  return useQuery({
    queryKey: ["students", studentId],
    queryFn: () => studentsApi.getById(studentId as string),
    enabled: Boolean(studentId),
  });
}

/**
 * "Meu filho não vai hoje" (Frente 10, auditoria 31/08/2026 — mobile
 * ainda não tinha, só web) — mesma paridade de
 * `apps/web/src/features/students/hooks/use-students.ts` (Epic C):
 * marcado ANTES da viagem do dia começar (o backend rejeita depois, com
 * mensagem clara — mesmo guard de address-overrides); nunca bloqueia o
 * uso do app.
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
