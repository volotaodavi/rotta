import { Injectable } from "@nestjs/common";


import type {
  ActiveTripWithDetails,
  CreateTripData,
  TripRepository,
  UpdateTripData,
} from "./trip.repository";
import type { Trip } from "@prisma/client";

import { PrismaService } from "@/infra/database/prisma.service";

@Injectable()
export class PrismaTripRepository implements TripRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: CreateTripData): Promise<Trip> {
    return this.prisma.withTenant(this.prisma.trip.create({ data }));
  }

  findById(id: string): Promise<Trip | null> {
    return this.prisma.withTenant(this.prisma.trip.findUnique({ where: { id } }));
  }

  findByRouteAndDate(routeId: string, data: Date): Promise<Trip | null> {
    return this.prisma.withTenant(
      this.prisma.trip.findUnique({ where: { routeId_data: { routeId, data } } }),
    );
  }

  update(id: string, data: UpdateTripData): Promise<Trip> {
    return this.prisma.withTenant(this.prisma.trip.update({ where: { id }, data }));
  }

  listActiveByCompany(companyId: string): Promise<ActiveTripWithDetails[]> {
    return this.prisma.withTenant(
      this.prisma.trip.findMany({
        where: { companyId, status: "EM_ANDAMENTO" },
        include: {
          veiculo: true,
          route: { select: { id: true, nome: true, turno: true } },
          motorista: { select: { id: true, nome: true } },
          monitor: { select: { id: true, nome: true } },
        },
      }),
    );
  }

  findActiveDetailedByRouteId(routeId: string, data: Date): Promise<ActiveTripWithDetails | null> {
    return this.prisma.withBypass(
      this.prisma.trip.findFirst({
        where: { routeId, data, status: "EM_ANDAMENTO" },
        include: {
          veiculo: true,
          route: { select: { id: true, nome: true, turno: true } },
          motorista: { select: { id: true, nome: true } },
          monitor: { select: { id: true, nome: true } },
        },
      }),
    );
  }

  async listByRoute(
    routeId: string,
    page: number,
    pageSize: number,
  ): Promise<{ items: Trip[]; total: number }> {
    const [items, total] = await Promise.all([
      this.prisma.withTenant(
        this.prisma.trip.findMany({
          where: { routeId },
          orderBy: { data: "desc" },
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
      ),
      this.prisma.withTenant(this.prisma.trip.count({ where: { routeId } })),
    ]);
    return { items, total };
  }
}
