import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { CreateVehicleOccurrenceInput, VehicleChecklistInput } from "@rotta/api-client";

import { vehiclesApi } from "@/lib/api-client";

/**
 * Hooks de dados do módulo Veículos no app mobile (Dossiê 23, Secao
 * 2.2) — escopo do Motorista/Monitor: `GET /vehicles/me` (briefing "APP
 * MOBILE" — Meu Veículo) e leitura/registro do que a API permite a este
 * papel (Dossiê 13 — RBAC: Motorista só enxerga o veículo atualmente
 * vinculado a ele, nunca cadastra/edita, nunca envia foto/documento do
 * veículo — apenas Empresa/Gestor fazem isso).
 */
export function useMyVehicle() {
  return useQuery({
    queryKey: ["vehicles", "me"],
    queryFn: () => vehiclesApi.getMyVehicle(),
  });
}

/**
 * Epic A (Responsável) — veículos com decisão do Admin Rotta ainda não
 * reconhecida ("Li e concordo"). Mesmo par de hooks de
 * `apps/web/src/features/vehicles/hooks/use-vehicles.ts`.
 */
export function usePendingVehicleAdminReviewAcknowledgements() {
  return useQuery({
    queryKey: ["vehicles", "pendencias-revisao-admin"],
    queryFn: () => vehiclesApi.listPendingAdminReviewAcknowledgements(),
  });
}

/** "Li e concordo" — de propósito nunca existe "recusar" (pedido explícito do usuário). */
export function useAcknowledgeVehicleAdminReview(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => vehiclesApi.acknowledgeAdminReview(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["vehicles", "pendencias-revisao-admin"] });
    },
  });
}

export function useVehicleDocuments(vehicleId: string | undefined) {
  return useQuery({
    queryKey: ["vehicles", vehicleId, "documents"],
    queryFn: () => vehiclesApi.listDocuments(vehicleId as string),
    enabled: Boolean(vehicleId),
  });
}

export function useVehicleMaintenances(vehicleId: string | undefined) {
  return useQuery({
    queryKey: ["vehicles", vehicleId, "maintenances"],
    queryFn: () => vehiclesApi.listMaintenances(vehicleId as string, 1, 50),
    enabled: Boolean(vehicleId),
  });
}

export function useVehicleChecklists(vehicleId: string | undefined) {
  return useQuery({
    queryKey: ["vehicles", vehicleId, "checklists"],
    queryFn: () => vehiclesApi.listChecklists(vehicleId as string, 1, 20),
    enabled: Boolean(vehicleId),
  });
}

export function useCreateVehicleChecklist(vehicleId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: VehicleChecklistInput) =>
      vehiclesApi.createChecklist(vehicleId as string, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["vehicles", vehicleId, "checklists"] });
    },
  });
}

export function useVehicleOccurrences(vehicleId: string | undefined) {
  return useQuery({
    queryKey: ["vehicles", vehicleId, "occurrences"],
    queryFn: () => vehiclesApi.listOccurrences(vehicleId as string, 1, 20),
    enabled: Boolean(vehicleId),
  });
}

export function useCreateVehicleOccurrence(vehicleId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateVehicleOccurrenceInput) =>
      vehiclesApi.createOccurrence(vehicleId as string, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["vehicles", vehicleId, "occurrences"] });
    },
  });
}
