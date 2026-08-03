"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { ListVehiclesParams, VehicleStatus } from "@rotta/api-client";

import { vehiclesApi } from "@/lib/api-client";


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
