import { Injectable } from "@nestjs/common";


import type {
  CreateRouteData,
  ListRoutesFilter,
  ListRoutesResult,
  RouteRepository,
  UpdateRouteData,
} from "./route.repository";
import type { Prisma, Route } from "@prisma/client";

import { PrismaService } from "@/infra/database/prisma.service";

@Injectable()
export class PrismaRouteRepository implements RouteRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: CreateRouteData): Promise<Route> {
    return this.prisma.withTenant(this.prisma.route.create({ data }));
  }

  findById(id: string): Promise<Route | null> {
    return this.prisma.withTenant(this.prisma.route.findFirst({ where: { id, deletedAt: null } }));
  }

  update(id: string, data: UpdateRouteData): Promise<Route> {
    return this.prisma.withTenant(this.prisma.route.update({ where: { id }, data }));
  }

  async list(filter: ListRoutesFilter): Promise<ListRoutesResult> {
    const where: Prisma.RouteWhereInput = {
      deletedAt: null,
      ...(filter.companyId ? { companyId: filter.companyId } : {}),
      ...(filter.status ? { status: filter.status } : {}),
      ...(filter.turno ? { turno: filter.turno } : {}),
      ...(filter.search ? { nome: { contains: filter.search, mode: "insensitive" } } : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.withTenant(
        this.prisma.route.findMany({
          where,
          orderBy: { createdAt: "desc" },
          skip: (filter.page - 1) * filter.pageSize,
          take: filter.pageSize,
        }),
      ),
      this.prisma.withTenant(this.prisma.route.count({ where })),
    ]);

    return { items, total };
  }

  listAllActive(companyId: string): Promise<Route[]> {
    return this.prisma.withTenant(
      this.prisma.route.findMany({ where: { companyId, deletedAt: null } }),
    );
  }
}
