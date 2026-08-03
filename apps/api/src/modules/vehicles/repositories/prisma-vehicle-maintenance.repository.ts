import { Injectable } from "@nestjs/common";


import type {
  CreateVehicleMaintenanceData,
  ListVehicleMaintenancesFilter,
  ListVehicleMaintenancesResult,
  VehicleMaintenanceRepository,
} from "./vehicle-maintenance.repository";
import type { VehicleMaintenance } from "@prisma/client";

import { PrismaService } from "@/infra/database/prisma.service";

@Injectable()
export class PrismaVehicleMaintenanceRepository implements VehicleMaintenanceRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: CreateVehicleMaintenanceData): Promise<VehicleMaintenance> {
    return this.prisma.withTenant(this.prisma.vehicleMaintenance.create({ data }));
  }

  findById(id: string): Promise<VehicleMaintenance | null> {
    return this.prisma.withTenant(this.prisma.vehicleMaintenance.findFirst({ where: { id } }));
  }

  async list(filter: ListVehicleMaintenancesFilter): Promise<ListVehicleMaintenancesResult> {
    const where = { vehicleId: filter.vehicleId, ...(filter.tipo ? { tipo: filter.tipo } : {}) };

    const [items, total] = await Promise.all([
      this.prisma.withTenant(
        this.prisma.vehicleMaintenance.findMany({
          where,
          orderBy: { data: "desc" },
          skip: (filter.page - 1) * filter.pageSize,
          take: filter.pageSize,
        }),
      ),
      this.prisma.withTenant(this.prisma.vehicleMaintenance.count({ where })),
    ]);

    return { items, total };
  }
}
