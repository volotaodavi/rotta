import { Injectable } from "@nestjs/common";


import type {
  CreateDriverDocumentData,
  DriverDocumentRepository,
  ListDriverDocumentsFilter,
  UpdateDriverDocumentAiResultData,
} from "./driver-document.repository";
import type { DriverDocument } from "@prisma/client";

import { PrismaService } from "@/infra/database/prisma.service";

@Injectable()
export class PrismaDriverDocumentRepository implements DriverDocumentRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: CreateDriverDocumentData): Promise<DriverDocument> {
    return this.prisma.withTenant(this.prisma.driverDocument.create({ data }));
  }

  findById(id: string): Promise<DriverDocument | null> {
    return this.prisma.withTenant(
      this.prisma.driverDocument.findFirst({ where: { id, deletedAt: null } }),
    );
  }

  updateAiResult(id: string, data: UpdateDriverDocumentAiResultData): Promise<DriverDocument> {
    return this.prisma.withTenant(this.prisma.driverDocument.update({ where: { id }, data }));
  }

  listByUser(filter: ListDriverDocumentsFilter): Promise<DriverDocument[]> {
    return this.prisma.withTenant(
      this.prisma.driverDocument.findMany({
        where: {
          userId: filter.userId,
          deletedAt: null,
          ...(filter.tipo ? { tipo: filter.tipo } : {}),
        },
        orderBy: { createdAt: "desc" },
      }),
    );
  }

  listExpiringSoon(companyId: string, withinDays: number): Promise<DriverDocument[]> {
    const limit = new Date();
    limit.setDate(limit.getDate() + withinDays);

    return this.prisma.withTenant(
      this.prisma.driverDocument.findMany({
        where: { companyId, deletedAt: null, vencimentoEm: { not: null, lte: limit } },
        orderBy: { vencimentoEm: "asc" },
      }),
    );
  }

  softDelete(id: string): Promise<DriverDocument> {
    return this.prisma.withTenant(
      this.prisma.driverDocument.update({ where: { id }, data: { deletedAt: new Date() } }),
    );
  }
}
