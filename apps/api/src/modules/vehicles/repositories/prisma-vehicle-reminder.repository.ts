import { Injectable } from "@nestjs/common";

import type {
  CreateVehicleReminderData,
  UpdateVehicleReminderData,
  VehicleReminderRepository,
} from "./vehicle-reminder.repository";
import type { VehicleReminder, VehicleReminderType } from "@prisma/client";

import { PrismaService } from "@/infra/database/prisma.service";

@Injectable()
export class PrismaVehicleReminderRepository implements VehicleReminderRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: CreateVehicleReminderData): Promise<VehicleReminder> {
    return this.prisma.withTenant(this.prisma.vehicleReminder.create({ data }));
  }

  findById(id: string): Promise<VehicleReminder | null> {
    return this.prisma.withTenant(this.prisma.vehicleReminder.findFirst({ where: { id } }));
  }

  findPendingByVehicleAndType(
    vehicleId: string,
    tipo: VehicleReminderType,
  ): Promise<VehicleReminder | null> {
    return this.prisma.withTenant(
      this.prisma.vehicleReminder.findFirst({ where: { vehicleId, tipo, status: "PENDENTE" } }),
    );
  }

  update(id: string, data: UpdateVehicleReminderData): Promise<VehicleReminder> {
    return this.prisma.withTenant(this.prisma.vehicleReminder.update({ where: { id }, data }));
  }

  listByVehicle(vehicleId: string): Promise<VehicleReminder[]> {
    return this.prisma.withTenant(
      this.prisma.vehicleReminder.findMany({ where: { vehicleId }, orderBy: { dataAlvo: "asc" } }),
    );
  }

  listPendingByCompany(companyId: string): Promise<VehicleReminder[]> {
    return this.prisma.withTenant(
      this.prisma.vehicleReminder.findMany({
        where: { companyId, status: "PENDENTE" },
        orderBy: { dataAlvo: "asc" },
      }),
    );
  }
}
