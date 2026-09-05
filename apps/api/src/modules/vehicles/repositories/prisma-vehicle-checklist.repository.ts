import { Injectable } from "@nestjs/common";

import type {
  CreateVehicleChecklistData,
  ListVehicleChecklistsFilter,
  ListVehicleChecklistsResult,
  VehicleChecklistRepository,
} from "./vehicle-checklist.repository";
import type { VehicleChecklist } from "@prisma/client";

import { PrismaService } from "@/infra/database/prisma.service";

@Injectable()
export class PrismaVehicleChecklistRepository implements VehicleChecklistRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: CreateVehicleChecklistData): Promise<VehicleChecklist> {
    return this.prisma.withTenant(this.prisma.vehicleChecklist.create({ data }));
  }

  async list(filter: ListVehicleChecklistsFilter): Promise<ListVehicleChecklistsResult> {
    const where = { vehicleId: filter.vehicleId };

    const [items, total] = await Promise.all([
      this.prisma.withTenant(
        this.prisma.vehicleChecklist.findMany({
          where,
          orderBy: { createdAt: "desc" },
          skip: (filter.page - 1) * filter.pageSize,
          take: filter.pageSize,
        }),
      ),
      this.prisma.withTenant(this.prisma.vehicleChecklist.count({ where })),
    ]);

    return { items, total };
  }
}
