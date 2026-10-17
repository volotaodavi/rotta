import { Injectable } from "@nestjs/common";

import type {
  CreateVehicleChecklistData,
  ListVehicleChecklistsFilter,
  ListVehicleChecklistsResult,
  VehicleChecklistComContexto,
  VehicleChecklistRepository,
} from "./vehicle-checklist.repository";

import { PrismaService } from "@/infra/database/prisma.service";

/** O contexto de leitura (viagem + quem preencheu), um só lugar para os cinco `findX`. */
const COM_CONTEXTO = {
  trip: {
    select: {
      id: true,
      codigo: true,
      data: true,
      sentido: true,
      status: true,
      iniciadaEm: true,
      finalizadaEm: true,
    },
  },
  preenchidoPor: { select: { id: true, nome: true } },
} as const;

@Injectable()
export class PrismaVehicleChecklistRepository implements VehicleChecklistRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: CreateVehicleChecklistData): Promise<VehicleChecklistComContexto> {
    return this.prisma.withTenant(
      this.prisma.vehicleChecklist.create({ data, include: COM_CONTEXTO }),
    );
  }

  async list(filter: ListVehicleChecklistsFilter): Promise<ListVehicleChecklistsResult> {
    const where = { vehicleId: filter.vehicleId };

    const [items, total] = await Promise.all([
      this.prisma.withTenant(
        this.prisma.vehicleChecklist.findMany({
          where,
          include: COM_CONTEXTO,
          orderBy: { createdAt: "desc" },
          skip: (filter.page - 1) * filter.pageSize,
          take: filter.pageSize,
        }),
      ),
      this.prisma.withTenant(this.prisma.vehicleChecklist.count({ where })),
    ]);

    return { items, total };
  }

  findUltimoDaViagem(tripId: string): Promise<VehicleChecklistComContexto | null> {
    return this.prisma.withTenant(
      this.prisma.vehicleChecklist.findFirst({
        where: { tripId },
        include: COM_CONTEXTO,
        orderBy: { createdAt: "desc" },
      }),
    );
  }

  findUltimoPreViagem(vehicleId: string, desde: Date): Promise<VehicleChecklistComContexto | null> {
    return this.prisma.withTenant(
      this.prisma.vehicleChecklist.findFirst({
        where: { vehicleId, tripId: null, createdAt: { gte: desde } },
        include: COM_CONTEXTO,
        orderBy: { createdAt: "desc" },
      }),
    );
  }

  findUltimoDeViagemAnterior(
    vehicleId: string,
    exceto: string | null,
  ): Promise<VehicleChecklistComContexto | null> {
    return this.prisma.withTenant(
      this.prisma.vehicleChecklist.findFirst({
        where: {
          vehicleId,
          // Os dois `not` separados de propósito: "tem viagem" e "não é
          // a de agora" são condições diferentes, e escrever só a
          // segunda deixaria a dúvida de se `null` passa ou não.
          AND: [{ tripId: { not: null } }, ...(exceto ? [{ tripId: { not: exceto } }] : [])],
        },
        include: COM_CONTEXTO,
        orderBy: { createdAt: "desc" },
      }),
    );
  }

  async adotarPreViagem(vehicleId: string, tripId: string, desde: Date): Promise<number> {
    const { count } = await this.prisma.withTenant(
      this.prisma.vehicleChecklist.updateMany({
        where: { vehicleId, tripId: null, createdAt: { gte: desde } },
        data: { tripId },
      }),
    );
    return count;
  }

  findUltimoPorRotasAcrossTenants(routeIds: string[]): Promise<VehicleChecklistComContexto | null> {
    if (routeIds.length === 0) return Promise.resolve(null);
    return this.prisma.withBypass(
      this.prisma.vehicleChecklist.findFirst({
        where: { trip: { routeId: { in: routeIds } } },
        include: COM_CONTEXTO,
        orderBy: { createdAt: "desc" },
      }),
    );
  }
}
