import type { VehicleOccurrence, VehicleOccurrenceSeverity } from "@prisma/client";

export interface CreateVehicleOccurrenceData {
  vehicleId: string;
  companyId: string;
  reportadoPorId: string;
  titulo: string;
  descricao: string;
  severidade?: VehicleOccurrenceSeverity;
  fotoUrls?: string[];
}

export interface ListVehicleOccurrencesFilter {
  vehicleId: string;
  page: number;
  pageSize: number;
}

export interface ListVehicleOccurrencesResult {
  items: VehicleOccurrence[];
  total: number;
}

/** `vehicle_occurrences` tem RLS por `companyId` — append-only, ver nota em `vehicle.repository.ts`. */
export interface VehicleOccurrenceRepository {
  create(data: CreateVehicleOccurrenceData): Promise<VehicleOccurrence>;
  list(filter: ListVehicleOccurrencesFilter): Promise<ListVehicleOccurrencesResult>;
}
