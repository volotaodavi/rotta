import { Injectable } from "@nestjs/common";

import type {
  CreateVehicleData,
  ListVehiclesFilter,
  ListVehiclesResult,
  UpdateVehicleData,
  VehicleRepository,
} from "./vehicle.repository";
import type { Prisma, Vehicle } from "@prisma/client";

import { PrismaService } from "@/infra/database/prisma.service";

@Injectable()
export class PrismaVehicleRepository implements VehicleRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: CreateVehicleData, tx?: Prisma.TransactionClient): Promise<Vehicle> {
    if (tx) {
      return tx.vehicle.create({ data });
    }
    return this.prisma.withTenant(this.prisma.vehicle.create({ data }));
  }

  findById(id: string): Promise<Vehicle | null> {
    return this.prisma.withTenant(
      this.prisma.vehicle.findFirst({ where: { id, deletedAt: null } }),
    );
  }

  /**
   * `placa` é única globalmente (não apenas por tenant — ver nota no
   * schema), então esta consulta precisa de bypass de RLS para
   * detectar duplicidade mesmo com veículos de OUTRO tenant (o
   * candidato nunca vê os dados do veículo achado, apenas recebe
   * `ConflictException` do service — mesmo padrão de
   * `Company.findByCpfCnpj`, que também não filtra por tenant).
   */
  findByPlaca(placa: string): Promise<Vehicle | null> {
    return this.prisma.withBypass(this.prisma.vehicle.findFirst({ where: { placa } }));
  }

  update(id: string, data: UpdateVehicleData): Promise<Vehicle> {
    return this.prisma.withTenant(this.prisma.vehicle.update({ where: { id }, data }));
  }

  async list(filter: ListVehiclesFilter): Promise<ListVehiclesResult> {
    const where: Prisma.VehicleWhereInput = {
      deletedAt: filter.includeDeleted ? undefined : null,
      ...(filter.companyId ? { companyId: filter.companyId } : {}),
      ...(filter.status ? { status: filter.status } : {}),
      ...(filter.tipo ? { tipo: filter.tipo } : {}),
      ...(filter.motoristaId
        ? {
            vinculos: {
              some: { papel: "MOTORISTA", userId: filter.motoristaId, encerradoEm: null },
            },
          }
        : {}),
      ...(filter.search
        ? {
            OR: [
              { placa: { contains: filter.search, mode: "insensitive" } },
              { modelo: { contains: filter.search, mode: "insensitive" } },
              { marca: { contains: filter.search, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.withTenant(
        this.prisma.vehicle.findMany({
          where,
          orderBy: { [filter.sortBy]: filter.sortOrder },
          skip: (filter.page - 1) * filter.pageSize,
          take: filter.pageSize,
        }),
      ),
      this.prisma.withTenant(this.prisma.vehicle.count({ where })),
    ]);

    return { items, total };
  }

  listAllActive(companyId: string): Promise<Vehicle[]> {
    return this.prisma.withTenant(
      this.prisma.vehicle.findMany({ where: { companyId, deletedAt: null } }),
    );
  }

  async listPendingCategoryReview(filter: {
    companyId?: string;
    page: number;
    pageSize: number;
  }): Promise<ListVehiclesResult> {
    const where: Prisma.VehicleWhereInput = {
      deletedAt: null,
      categoriaRevisaoStatus: "PENDENTE",
      ...(filter.companyId ? { companyId: filter.companyId } : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.withBypass(
        this.prisma.vehicle.findMany({
          where,
          // Mais antigo primeiro — o veículo esperando revisão há mais
          // tempo aparece no topo da fila do Admin Rotta.
          orderBy: { createdAt: "asc" },
          skip: (filter.page - 1) * filter.pageSize,
          take: filter.pageSize,
        }),
      ),
      this.prisma.withBypass(this.prisma.vehicle.count({ where })),
    ]);

    return { items, total };
  }

  async listActiveResponsavelIds(vehicleId: string): Promise<string[]> {
    const rows = await this.prisma.withBypass(
      this.prisma.routeStudent.findMany({
        where: { ativo: true, route: { veiculoPadraoId: vehicleId, deletedAt: null } },
        select: { contract: { select: { responsavelId: true } } },
      }),
    );
    return [...new Set(rows.map((row) => row.contract.responsavelId))];
  }

  listVehiclesForResponsavel(responsavelId: string): Promise<Vehicle[]> {
    return this.prisma.withBypass(
      this.prisma.vehicle.findMany({
        where: {
          deletedAt: null,
          revisaoAdminStatus: { not: "PRE_APROVADO" },
          rotasPadrao: {
            some: {
              deletedAt: null,
              alunos: { some: { ativo: true, contract: { responsavelId } } },
            },
          },
        },
      }),
    );
  }

  async existsAdminReviewAcknowledgement(
    vehicleId: string,
    responsavelId: string,
    decisaoEm: Date,
  ): Promise<boolean> {
    const found = await this.prisma.withBypass(
      this.prisma.vehicleAdminReviewAcknowledgement.findUnique({
        where: { vehicleId_responsavelId_decisaoEm: { vehicleId, responsavelId, decisaoEm } },
      }),
    );
    return found !== null;
  }

  async createAdminReviewAcknowledgement(
    vehicleId: string,
    responsavelId: string,
    decisaoEm: Date,
  ): Promise<void> {
    await this.prisma.withBypass(
      this.prisma.vehicleAdminReviewAcknowledgement.create({
        data: { vehicleId, responsavelId, decisaoEm },
      }),
    );
  }
}
