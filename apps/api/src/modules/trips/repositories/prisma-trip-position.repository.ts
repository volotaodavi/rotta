import { Injectable } from "@nestjs/common";

import type { CreateTripPositionData, TripPositionRepository } from "./trip-position.repository";
import type { TripPosition } from "@prisma/client";

import { PrismaService } from "@/infra/database/prisma.service";

@Injectable()
export class PrismaTripPositionRepository implements TripPositionRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: CreateTripPositionData): Promise<TripPosition> {
    return this.prisma.withTenant(this.prisma.tripPosition.create({ data }));
  }

  /**
   * Mesmo padrão de `PrismaRouteStopRepository.createMany`:
   * `runInTenantTransaction` (transação interativa) em vez de
   * `withTenant` — necessário porque `withTenant` já é, ele próprio, um
   * `$transaction([...])` em lote, e não aceita um segundo
   * `$transaction` como "operação" (nem tipa nem funcionaria).
   */
  async createMany(data: CreateTripPositionData[]): Promise<TripPosition[]> {
    return this.prisma.runInTenantTransaction(async (tx) => {
      const created: TripPosition[] = [];
      for (const item of data) {
        created.push(await tx.tripPosition.create({ data: item }));
      }
      return created;
    });
  }

  listByTrip(tripId: string): Promise<TripPosition[]> {
    return this.prisma.withTenant(
      this.prisma.tripPosition.findMany({ where: { tripId }, orderBy: { capturadaEm: "asc" } }),
    );
  }

  findLatestByTrip(tripId: string): Promise<TripPosition | null> {
    return this.prisma.withTenant(
      this.prisma.tripPosition.findFirst({ where: { tripId }, orderBy: { capturadaEm: "desc" } }),
    );
  }
}
