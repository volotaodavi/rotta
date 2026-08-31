"use client";

import { useToast } from "@rotta/ui/web";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type {
  ListVehicleCategoryReviewParams,
  ListVehiclesParams,
  ResolveVehicleCategoryReviewInput,
  ReviewVehicleInput,
  VehicleStatus,
} from "@rotta/api-client";

import { vehiclesApi } from "@/lib/api-client";

/** Mensagem de erro legível — mesmo padrão de `use-identity-verification-admin.ts`. */
function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

/**
 * Hooks de dados do módulo Veículos (visão cross-tenant do Admin Rotta) —
 * mesmo padrão de `use-companies.ts`. Apenas leitura + troca de status,
 * já que o Admin Rotta não cadastra veículos (nenhuma empresa própria).
 */
export function useVehiclesList(params: ListVehiclesParams) {
  return useQuery({
    queryKey: ["vehicles", params],
    queryFn: () => vehiclesApi.list(params),
  });
}

export function useVehicle(id: string) {
  return useQuery({
    queryKey: ["vehicles", id],
    queryFn: () => vehiclesApi.getById(id),
    enabled: Boolean(id),
  });
}

export function useVehicleAuditLogs(id: string, page = 1, pageSize = 20) {
  return useQuery({
    queryKey: ["vehicles", id, "audit-logs", page, pageSize],
    queryFn: () => vehiclesApi.listAuditLogs(id, page, pageSize),
    enabled: Boolean(id),
  });
}

/**
 * Ocorrências do veículo (auditoria 31/08/2026, pedido do usuário: "as
 * ações do motorista/monitor refletindo?") — antes não existia NENHUMA
 * tela do Admin pra ver `VehicleOccurrence`, apesar do endpoint
 * (`GET /vehicles/:id/occurrences`) já liberar `ADMIN_ROTTA` em
 * `READ_ROLES`. `refetchInterval` (mesmo valor de `apps/web`) pra uma
 * ocorrência nova aparecer aqui sem precisar recarregar a página.
 */
export function useVehicleOccurrences(id: string, page = 1, pageSize = 20) {
  return useQuery({
    queryKey: ["vehicles", id, "occurrences", page, pageSize],
    queryFn: () => vehiclesApi.listOccurrences(id, page, pageSize),
    enabled: Boolean(id),
    refetchInterval: 30_000,
  });
}

export function useUpdateVehicleStatus(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (status: VehicleStatus) => vehiclesApi.updateStatus(id, status),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["vehicles", id] });
      void queryClient.invalidateQueries({ queryKey: ["vehicles"] });
    },
  });
}

/** Fila `/veiculos/revisao-categoria` (Frente AL) — só veículos com `categoriaRevisaoStatus = PENDENTE`. */
export function useVehicleCategoryReviewList(params: ListVehicleCategoryReviewParams) {
  return useQuery({
    queryKey: ["vehicles", "revisao-categoria", params],
    queryFn: () => vehiclesApi.listCategoryReview(params),
  });
}

/** Confirma (sem `categoria`) ou corrige (com `categoria` diferente) a sugestão da IA. */
export function useResolveVehicleCategoryReview(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (input: ResolveVehicleCategoryReviewInput) =>
      vehiclesApi.resolveCategoryReview(id, input),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: ["vehicles", "revisao-categoria"] });
      void queryClient.invalidateQueries({ queryKey: ["vehicles", id] });
      toast.success(variables.categoria ? "Categoria corrigida." : "Sugestão da IA confirmada.");
    },
    onError: (error) => {
      toast.error(errorMessage(error, "Não foi possível registrar a revisão."), "Falha ao revisar");
    },
  });
}

/**
 * Epic A — aprova/reprova um veículo (camada ADICIONAL sobre o
 * "pré-aprovado" automático). Invalida tanto a lista da empresa quanto o
 * veículo individual, já que os dois lugares mostram `revisaoAdminStatus`.
 */
export function useReviewVehicle(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (input: ReviewVehicleInput) => vehiclesApi.reviewVehicle(id, input),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: ["vehicles"] });
      toast.success(variables.status === "APROVADO" ? "Veículo aprovado." : "Veículo reprovado.");
    },
    onError: (error) => {
      toast.error(errorMessage(error, "Não foi possível registrar a decisão."), "Falha ao revisar");
    },
  });
}
