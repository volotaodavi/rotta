"use client";

import { useToast } from "@rotta/ui/web";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { CreateCompanyServiceAreaInput, CredenciarMunicipioInput } from "@rotta/api-client";

import { companyServiceAreasApi } from "@/lib/api-client";

/** Mensagem de erro legível — mesmo padrão de `use-vehicles.ts`. */
function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

/**
 * Área de atuação da transportadora (fluxo público) — onde ela PODE se
 * credenciar. Empresa sem nenhuma área continua podendo se credenciar
 * em qualquer escola, que é o comportamento do fluxo privado.
 */
export function useServiceAreas(companyId: string) {
  return useQuery({
    queryKey: ["service-areas", companyId],
    queryFn: () => companyServiceAreasApi.listar(companyId),
    enabled: Boolean(companyId),
  });
}

export function useCreateServiceArea(companyId: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (input: CreateCompanyServiceAreaInput) =>
      companyServiceAreasApi.criar(companyId, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["service-areas", companyId] });
      toast.success("Área de atuação adicionada.");
    },
    onError: (error) => {
      toast.error(errorMessage(error, "Não foi possível adicionar a área."), "Falha");
    },
  });
}

export function useRemoveServiceArea(companyId: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (areaId: string) => companyServiceAreasApi.remover(companyId, areaId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["service-areas", companyId] });
      toast.success("Área removida.");
    },
    onError: (error) => {
      toast.error(errorMessage(error, "Não foi possível remover a área."), "Falha");
    },
  });
}

/**
 * Credencia a transportadora em TODAS as escolas do município e
 * registra a área de atuação na mesma operação.
 *
 * Sem `toast` de sucesso aqui: a tela mostra os três números
 * (encontradas / credenciadas / já credenciadas), e é a comparação
 * deles com a planilha que diz se deu certo. Um "pronto!" automático
 * esconderia justamente o caso que importa — o município com 62 escolas
 * em que só 58 foram encontradas.
 */
export function useCredenciarMunicipio(companyId: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (input: CredenciarMunicipioInput) =>
      companyServiceAreasApi.credenciarMunicipio(companyId, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["service-areas", companyId] });
      void queryClient.invalidateQueries({ queryKey: ["schools"] });
    },
    onError: (error) => {
      toast.error(
        errorMessage(error, "Não foi possível credenciar o município."),
        "Falha no credenciamento",
      );
    },
  });
}
