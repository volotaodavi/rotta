import type { VehicleMaintenance, VehicleMaintenanceType } from "@prisma/client";

export interface CreateVehicleMaintenanceData {
  vehicleId: string;
  companyId: string;
  tipo: VehicleMaintenanceType;
  data: Date;
  quilometragem?: number;
  valorCentavos?: number;
  fornecedor?: string;
  observacoes?: string;
  registradoPorId: string;
}

export interface ListVehicleMaintenancesFilter {
  vehicleId: string;
  tipo?: VehicleMaintenanceType;
  page: number;
  pageSize: number;
}

export interface ListVehicleMaintenancesResult {
  items: VehicleMaintenance[];
  total: number;
}

/** `vehicle_maintenances` tem RLS por `companyId` — ver nota em `vehicle.repository.ts`. */
export interface VehicleMaintenanceRepository {
  create(data: CreateVehicleMaintenanceData): Promise<VehicleMaintenance>;
  findById(id: string): Promise<VehicleMaintenance | null>;
  list(filter: ListVehicleMaintenancesFilter): Promise<ListVehicleMaintenancesResult>;
}
