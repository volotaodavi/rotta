import type { VehicleAssignment, VehicleAssignmentRole } from "@prisma/client";

export interface CreateVehicleAssignmentData {
  vehicleId: string;
  companyId: string;
  papel: VehicleAssignmentRole;
  userId: string;
  criadoPorId: string;
}

/**
 * `vehicle_assignments` tem RLS por `companyId` — ver nota em
 * `vehicle.repository.ts`. Nunca há `update`/`delete` do vínculo em si:
 * "encerrar" é `encerraCurrent` (seta `encerradoEm`) seguido de um novo
 * `create` para o substituto — histórico sempre preservado.
 */
export interface VehicleAssignmentRepository {
  create(data: CreateVehicleAssignmentData): Promise<VehicleAssignment>;
  findCurrent(vehicleId: string, papel: VehicleAssignmentRole): Promise<VehicleAssignment | null>;
  encerraCurrent(vehicleId: string, papel: VehicleAssignmentRole): Promise<void>;
  listHistoryByVehicle(vehicleId: string): Promise<VehicleAssignment[]>;
  /** Veículo atualmente vinculado a este usuário (Motorista/Monitor consultando "Meu Veículo"). */
  findCurrentVehicleIdForUser(userId: string, papel: VehicleAssignmentRole): Promise<string | null>;
}
