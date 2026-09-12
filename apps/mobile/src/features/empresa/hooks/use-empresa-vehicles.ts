import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { ListVehiclesParams, VehicleStatus } from "@rotta/api-client";

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
