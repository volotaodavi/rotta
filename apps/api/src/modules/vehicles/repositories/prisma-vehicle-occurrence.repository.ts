import { Injectable } from "@nestjs/common";

import type {
  CreateVehicleOccurrenceData,
  ListVehicleOccurrencesFilter,
  ListVehicleOccurrencesResult,
  VehicleOccurrenceRepository,
} from "./vehicle-occurrence.repository";
import type { VehicleOccurrence } from "@prisma/client";

import { PrismaService } from "@/infra/database/prisma.service";

@Injectable()
export class PrismaVehicleOccurrenceRepository implements VehicleOccurrenceRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: CreateVehicleOccurrenceData): Promise<VehicleOccurrence> {
    return this.prisma.withTenant(this.prisma.vehicleOccurrence.create({ data }));
  }

  async list(filter: ListVehicleOccurrencesFilter): Promise<ListVehicleOccurrencesResult> {
    const where = { vehicleId: filter.vehicleId };

    const [items, total] = await Promise.all([
      this.prisma.withTenant(
        this.prisma.vehicleOccurrence.findMany({
          where,
          orderBy: { createdAt: "desc" },
          skip: (filter.page - 1) * filter.pageSize,
          take: filter.pageSize,
        }),
      ),
      this.prisma.withTenant(this.prisma.vehicleOccurrence.count({ where })),
    ]);

    return { items, total };
  }
}
