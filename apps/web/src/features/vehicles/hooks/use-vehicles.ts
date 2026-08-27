"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type {
  CreateVehicleAssignmentInput,
  CreateVehicleDocumentMeta,
  CreateVehicleInput,
  CreateVehicleMaintenanceInput,
  CreateVehicleOccurrenceInput,
  CreateVehicleReminderInput,
  ListVehiclesParams,
  UpdateVehicleInput,
  VehicleChecklistInput,
  VehicleReminderStatus,
  VehicleStatus,
} from "@rotta/api-client";

import { vehiclesApi } from "@/lib/api-client";

/**
 * Hooks de dados do módulo Veículos (Painel Web — Empresa/Gestor
 * gerenciando a própria frota), mesmo padrão de `use-companies.ts`.
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

/**
 * "Meu Veículo" — `GET /vehicles/me` (`@Roles(MOTORISTA, MONITOR)`,
 * Dossiê 13 §RBAC) já existia no backend e no app mobile (Frente L,
 * tarefa #59), mas nunca tinha sido ligado no Painel Web (Frente O,
 * pedido do usuário: barra de navegação reduzida a Início/Atividades/
 * Veículo/Perfil). `null` quando não há vínculo ativo — nunca os dados
 * de outro veículo.
 */
export function useMyVehicle() {
  return useQuery({
    queryKey: ["vehicles", "me"],
    queryFn: () => vehiclesApi.getMyVehicle(),
  });
}

/**
 * Epic A (Responsável) — veículos com decisão do Admin Rotta ainda não
 * reconhecida ("Li e concordo"). Só relevante pra quem tem `role`
 * responsável; a página que monta o modal decide isso, não este hook.
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

export function useVehicleDashboard() {
  return useQuery({
    queryKey: ["vehicles", "dashboard"],
    queryFn: () => vehiclesApi.getDashboard(),
  });
}

export function useCreateVehicle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateVehicleInput) => vehiclesApi.create(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["vehicles"] });
    },
  });
}

/** "Buscar pela placa" (pedido do usuário) — mutação (não query), disparada só quando a empresa clica no botão, nunca a cada tecla digitada. */
export function useLookupVehicleByPlate() {
  return useMutation({
    mutationFn: (placa: string) => vehiclesApi.lookupByPlate(placa),
  });
}

export function useUpdateVehicle(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateVehicleInput) => vehiclesApi.update(id, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["vehicles", id] });
      void queryClient.invalidateQueries({ queryKey: ["vehicles"] });
    },
  });
}

export function useDeleteVehicle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => vehiclesApi.remove(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["vehicles"] });
    },
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

export function useUploadVehiclePhoto(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => vehiclesApi.uploadPhoto(id, file),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["vehicles", id] });
    },
  });
}

export function useVehicleAuditLogs(id: string, page = 1, pageSize = 20) {
  return useQuery({
    queryKey: ["vehicles", id, "audit-logs", page, pageSize],
    queryFn: () => vehiclesApi.listAuditLogs(id, page, pageSize),
    enabled: Boolean(id),
  });
}

// --- Documentos ---

export function useVehicleDocuments(id: string) {
  return useQuery({
    queryKey: ["vehicles", id, "documents"],
    queryFn: () => vehiclesApi.listDocuments(id),
    enabled: Boolean(id),
  });
}

export function useUploadVehicleDocument(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ meta, file }: { meta: CreateVehicleDocumentMeta; file: File }) =>
      vehiclesApi.uploadDocument(id, meta, file),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["vehicles", id, "documents"] });
      void queryClient.invalidateQueries({ queryKey: ["vehicles", id, "reminders"] });
    },
  });
}

export function useRemoveVehicleDocument(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (documentId: string) => vehiclesApi.removeDocument(id, documentId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["vehicles", id, "documents"] });
    },
  });
}

// --- Manutenção ---

export function useVehicleMaintenances(id: string, page = 1, pageSize = 20) {
  return useQuery({
    queryKey: ["vehicles", id, "maintenances", page, pageSize],
    queryFn: () => vehiclesApi.listMaintenances(id, page, pageSize),
    enabled: Boolean(id),
  });
}

export function useCreateVehicleMaintenance(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateVehicleMaintenanceInput) => vehiclesApi.createMaintenance(id, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["vehicles", id, "maintenances"] });
      void queryClient.invalidateQueries({ queryKey: ["vehicles", id] });
    },
  });
}

// --- Lembretes ---

export function useVehicleReminders(id: string) {
  return useQuery({
    queryKey: ["vehicles", id, "reminders"],
    queryFn: () => vehiclesApi.listReminders(id),
    enabled: Boolean(id),
  });
}

export function useCreateVehicleReminder(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateVehicleReminderInput) => vehiclesApi.createReminder(id, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["vehicles", id, "reminders"] });
    },
  });
}

export function useUpdateVehicleReminderStatus(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ reminderId, status }: { reminderId: string; status: VehicleReminderStatus }) =>
      vehiclesApi.updateReminderStatus(id, reminderId, status),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["vehicles", id, "reminders"] });
    },
  });
}

// --- Vínculos (Motorista/Monitor) ---

export function useVehicleAssignmentHistory(id: string) {
  return useQuery({
    queryKey: ["vehicles", id, "assignments"],
    queryFn: () => vehiclesApi.listAssignmentHistory(id),
    enabled: Boolean(id),
  });
}

export function useAssignVehicle(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateVehicleAssignmentInput) => vehiclesApi.assign(id, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["vehicles", id, "assignments"] });
      void queryClient.invalidateQueries({ queryKey: ["vehicles", id] });
    },
  });
}

// --- Checklist ---

export function useVehicleChecklists(id: string, page = 1, pageSize = 20) {
  return useQuery({
    queryKey: ["vehicles", id, "checklists", page, pageSize],
    queryFn: () => vehiclesApi.listChecklists(id, page, pageSize),
    enabled: Boolean(id),
  });
}

// --- Ocorrências ---

export function useVehicleOccurrences(id: string, page = 1, pageSize = 20) {
  return useQuery({
    queryKey: ["vehicles", id, "occurrences", page, pageSize],
    queryFn: () => vehiclesApi.listOccurrences(id, page, pageSize),
    enabled: Boolean(id),
  });
}

export function useCreateVehicleOccurrence(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateVehicleOccurrenceInput) => vehiclesApi.createOccurrence(id, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["vehicles", id, "occurrences"] });
    },
  });
}

export type { VehicleChecklistInput };
