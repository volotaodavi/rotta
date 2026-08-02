import { Injectable } from "@nestjs/common";

import type {
  CreateVehicleDocumentData,
  ListVehicleDocumentsFilter,
  UpdateVehicleDocumentAiResultData,
  VehicleDocumentRepository,
} from "./vehicle-document.repository";
import type { VehicleDocument } from "@prisma/client";

import { PrismaService } from "@/infra/database/prisma.service";

@Injectable()
export class PrismaVehicleDocumentRepository implements VehicleDocumentRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: CreateVehicleDocumentData): Promise<VehicleDocument> {
    return this.prisma.withTenant(this.prisma.vehicleDocument.create({ data }));
  }

  findById(id: string): Promise<VehicleDocument | null> {
    return this.prisma.withTenant(
      this.prisma.vehicleDocument.findFirst({ where: { id, deletedAt: null } }),
    );
  }

  updateAiResult(id: string, data: UpdateVehicleDocumentAiResultData): Promise<VehicleDocument> {
    return this.prisma.withTenant(this.prisma.vehicleDocument.update({ where: { id }, data }));
  }

  listByVehicle(filter: ListVehicleDocumentsFilter): Promise<VehicleDocument[]> {
    return this.prisma.withTenant(
      this.prisma.vehicleDocument.findMany({
        where: {
          vehicleId: filter.vehicleId,
          deletedAt: null,
          ...(filter.tipo ? { tipo: filter.tipo } : {}),
        },
        orderBy: { createdAt: "desc" },
      }),
    );
  }

  listExpiringSoon(companyId: string, withinDays: number): Promise<VehicleDocument[]> {
    const limit = new Date();
    limit.setDate(limit.getDate() + withinDays);

    return this.prisma.withTenant(
      this.prisma.vehicleDocument.findMany({
        where: { companyId, deletedAt: null, vencimentoEm: { not: null, lte: limit } },
        orderBy: { vencimentoEm: "asc" },
      }),
    );
  }

  softDelete(id: string): Promise<VehicleDocument> {
    return this.prisma.withTenant(
      this.prisma.vehicleDocument.update({ where: { id }, data: { deletedAt: new Date() } }),
    );
  }
}
