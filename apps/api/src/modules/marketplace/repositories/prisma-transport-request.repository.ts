import { Injectable } from "@nestjs/common";


import type {
  CreateTransportRequestData,
  ListTransportRequestsFilter,
  ListTransportRequestsResult,
  TransportRequestAccessScope,
  TransportRequestRepository,
  UpdateTransportRequestStatusData,
} from "./transport-request.repository";
import type { Prisma, TransportRequest } from "@prisma/client";

import { PrismaService } from "@/infra/database/prisma.service";

const OPEN_STATUSES: Prisma.TransportRequestWhereInput["status"] = {
  in: ["RECEBIDA", "EM_ANALISE"],
};

function scopeWhere(scope: TransportRequestAccessScope): Prisma.TransportRequestWhereInput {
  return {
    ...(scope.responsavelId ? { responsavelId: scope.responsavelId } : {}),
    ...(scope.companyId ? { companyId: scope.companyId } : {}),
  };
}

@Injectable()
export class PrismaTransportRequestRepository implements TransportRequestRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: CreateTransportRequestData): Promise<TransportRequest> {
    return this.prisma.withBypass(this.prisma.transportRequest.create({ data }));
  }

  async findByIdScoped(
    id: string,
    scope: TransportRequestAccessScope,
  ): Promise<TransportRequest | null> {
    const where: Prisma.TransportRequestWhereInput = { id, ...scopeWhere(scope) };
    return scope.responsavelId
      ? this.prisma.withBypass(this.prisma.transportRequest.findFirst({ where }))
      : this.prisma.withTenant(this.prisma.transportRequest.findFirst({ where }));
  }

  findById(id: string): Promise<TransportRequest | null> {
    return this.prisma.withTenant(this.prisma.transportRequest.findFirst({ where: { id } }));
  }

  findOpenByStudentAndCompany(
    studentId: string,
    companyId: string,
  ): Promise<TransportRequest | null> {
    return this.prisma.withBypass(
      this.prisma.transportRequest.findFirst({
        where: { studentId, companyId, status: OPEN_STATUSES },
      }),
    );
  }

  updateStatus(id: string, data: UpdateTransportRequestStatusData): Promise<TransportRequest> {
    return this.prisma.withTenant(this.prisma.transportRequest.update({ where: { id }, data }));
  }

  async list(filter: ListTransportRequestsFilter): Promise<ListTransportRequestsResult> {
    const where: Prisma.TransportRequestWhereInput = {
      ...scopeWhere(filter),
      ...(filter.status ? { status: filter.status } : {}),
    };

    const findMany = () =>
      this.prisma.transportRequest.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (filter.page - 1) * filter.pageSize,
        take: filter.pageSize,
      });
    const count = () => this.prisma.transportRequest.count({ where });

    const [items, total] = filter.responsavelId
      ? await Promise.all([this.prisma.withBypass(findMany()), this.prisma.withBypass(count())])
      : await Promise.all([this.prisma.withTenant(findMany()), this.prisma.withTenant(count())]);

    return { items, total };
  }
}
