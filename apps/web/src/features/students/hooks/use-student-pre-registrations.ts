"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { CreateStudentPreRegistrationInput } from "@rotta/api-client";

import { studentPreRegistrationsApi } from "@/lib/api-client";

/**
 * Hooks de dados de `student-pre-registrations` (pedido do usuário:
 * "no painel do admin deverá ter essa opção de cadastrar alunos por
 * transporte + responsável") — lado da Empresa/Gestor
 * (`/alunos-pre-cadastro`). O backend já escopa `list`/`create`/`cancel`
 * pela própria empresa do token (nunca um `companyId` aqui).
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

/**
 * Lado do Responsável — "código do transporte + celular" (pedido do
 * usuário). Mutação (não `useQuery`) de propósito: só dispara quando o
 * Responsável envia o formulário, nunca a cada tecla digitada.
 */
export function useLookupStudentPreRegistration() {
  return useMutation({
    mutationFn: ({ codigoInterno, celular }: { codigoInterno: string; celular: string }) =>
      studentPreRegistrationsApi.lookup(codigoInterno, celular),
  });
}

/** Caminho "Continuar" — reivindica o pré-cadastro encontrado. */
export function useClaimStudentPreRegistration() {
  return useMutation({
    mutationFn: (id: string) => studentPreRegistrationsApi.claim(id),
  });
}
