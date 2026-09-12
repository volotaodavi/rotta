import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { CreateStudentPreRegistrationInput } from "@rotta/api-client";

import { studentPreRegistrationsApi } from "@/lib/api-client";

/**
 * Hooks de `student-pre-registrations` no app (Frente 2 — Empresa/
 * Gestor reduzida) — mirror exato de
 * `apps/web/src/features/students/hooks/use-student-pre-registrations.ts`,
 * só o lado da Empresa/Gestor (`create`/`list`/`cancel`; `lookup`/
 * `claim` são do lado do Responsável, fora de escopo aqui). O backend
 * já escopa tudo pela própria empresa do token, nunca um `companyId`
 * explícito.
 */
const QUERY_KEY = ["student-pre-registrations"];

export function useStudentPreRegistrations() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => studentPreRegistrationsApi.list(),
  });
}

export function useCreateStudentPreRegistration() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateStudentPreRegistrationInput) =>
      studentPreRegistrationsApi.create(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}

export function useCancelStudentPreRegistration() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => studentPreRegistrationsApi.cancel(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}
