import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type {
  CreateVehicleDocumentMeta,
  CreateVehicleInput,
  ListVehiclesParams,
  VehicleStatus,
} from "@rotta/api-client";

import { vehiclesApi } from "@/lib/api-client";

/**
 * Hooks de Veículos pro lado da Empresa/Gestor (Frente 3a — Frota,
 * Empresa/Gestor reduzida) — mesmos endpoints já usados por
 * `apps/web/src/features/vehicles/hooks/use-vehicles.ts`
 * (`vehiclesApi.list`/`getById`/`updateStatus`), só com hooks próprios
 * porque `features/vehicles/hooks/use-vehicles.ts` hoje é o lado do
 * Motorista/Monitor (`getMyVehicle`, veículo singular).
 */
const VEHICLES_QUERY_KEY = ["empresa", "vehicles"] as const;

export function useVehiclesList(params: ListVehiclesParams = { pageSize: 100 }) {
  return useQuery({
    queryKey: [...VEHICLES_QUERY_KEY, "list", params],
    queryFn: () => vehiclesApi.list(params),
  });
}

export function useVehicle(id: string | undefined) {
  return useQuery({
    queryKey: [...VEHICLES_QUERY_KEY, id],
    queryFn: () => vehiclesApi.getById(id as string),
    enabled: Boolean(id),
  });
}

export function useUpdateVehicleStatus(id: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (status: VehicleStatus) => vehiclesApi.updateStatus(id as string, status),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: VEHICLES_QUERY_KEY });
    },
  });
}

/**
 * Frente 3b — "buscar pela placa" (mesmo autofill de
 * `apps/web/.../veiculos/novo/page.tsx`: marca/modelo/ano/cor
 * preenchidos quando o provedor resolve). Mutation (não `useQuery`) de
 * propósito — quem chama decide quando disparar (debounce da tela),
 * nunca a cada tecla digitada sozinho.
 */
export function useLookupVehicleByPlate() {
  return useMutation({
    mutationFn: (placa: string) => vehiclesApi.lookupByPlate(placa),
  });
}

export function useCreateVehicle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateVehicleInput) => vehiclesApi.create(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: VEHICLES_QUERY_KEY });
    },
  });
}

/**
 * Documentos de veículo — listar reaproveita `useVehicleDocuments` de
 * `features/vehicles/hooks/use-vehicles.ts` (já existe, mesma query
 * key `["vehicles", vehicleId, "documents"]`); só upload/remoção
 * faltavam em todo o app mobile (Frente 3b é o primeiro upload de
 * arquivo do app — ver `empresa-veiculo-documentos-screen.tsx`).
 */
export function useUploadVehicleDocument(vehicleId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ meta, file }: { meta: CreateVehicleDocumentMeta; file: File | Blob }) =>
      vehiclesApi.uploadDocument(vehicleId as string, meta, file),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["vehicles", vehicleId, "documents"] });
    },
  });
}

export function useRemoveVehicleDocument(vehicleId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (documentId: string) => vehiclesApi.removeDocument(vehicleId as string, documentId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["vehicles", vehicleId, "documents"] });
    },
  });
}
