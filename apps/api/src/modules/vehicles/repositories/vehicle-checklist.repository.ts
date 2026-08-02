import type { VehicleChecklist } from "@prisma/client";

export interface CreateVehicleChecklistData {
  vehicleId: string;
  companyId: string;
  motoristaId: string;
  viagemId?: string;
  pneusOk: boolean;
  lucesOk: boolean;
  combustivelOk: boolean;
  limpezaOk: boolean;
  equipamentosObrigatoriosOk: boolean;
  observacoes?: string;
}

export interface ListVehicleChecklistsFilter {
  vehicleId: string;
  page: number;
  pageSize: number;
}

export interface ListVehicleChecklistsResult {
  items: VehicleChecklist[];
  total: number;
}

/** `vehicle_checklists` tem RLS por `companyId` — append-only, ver nota em `vehicle.repository.ts`. */
export interface VehicleChecklistRepository {
  create(data: CreateVehicleChecklistData): Promise<VehicleChecklist>;
  list(filter: ListVehicleChecklistsFilter): Promise<ListVehicleChecklistsResult>;
}
