import type { VehicleReminder, VehicleReminderStatus, VehicleReminderType } from "@prisma/client";

export interface CreateVehicleReminderData {
  vehicleId: string;
  companyId: string;
  tipo: VehicleReminderType;
  dataAlvo: Date;
  quilometragemAlvo?: number;
  observacoes?: string;
  origemDocumentoId?: string;
}

export interface UpdateVehicleReminderData {
  status?: VehicleReminderStatus;
  dataAlvo?: Date;
  observacoes?: string;
  concluidoEm?: Date | null;
}

/** `vehicle_reminders` tem RLS por `companyId` — ver nota em `vehicle.repository.ts`. */
export interface VehicleReminderRepository {
  create(data: CreateVehicleReminderData): Promise<VehicleReminder>;
  findById(id: string): Promise<VehicleReminder | null>;
  /** Lembrete pendente já existente para o mesmo veículo+tipo — evita duplicar ao reprocessar vencimento de documento. */
  findPendingByVehicleAndType(
    vehicleId: string,
    tipo: VehicleReminderType,
  ): Promise<VehicleReminder | null>;
  update(id: string, data: UpdateVehicleReminderData): Promise<VehicleReminder>;
  listByVehicle(vehicleId: string): Promise<VehicleReminder[]>;
  listPendingByCompany(companyId: string): Promise<VehicleReminder[]>;
}
