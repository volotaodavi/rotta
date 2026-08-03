import { Injectable } from "@nestjs/common";


import type {
  CreateVehicleAssignmentData,
  VehicleAssignmentRepository,
} from "./vehicle-assignment.repository";
import type { VehicleAssignment, VehicleAssignmentRole } from "@prisma/client";

import { PrismaService } from "@/infra/database/prisma.service";

@Injectable()
export class PrismaVehicleAssignmentRepository implements VehicleAssignmentRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: CreateVehicleAssignmentData): Promise<VehicleAssignment> {
    return this.prisma.withTenant(this.prisma.vehicleAssignment.create({ data }));
  }

  findCurrent(vehicleId: string, papel: VehicleAssignmentRole): Promise<VehicleAssignment | null> {
    return this.prisma.withTenant(
      this.prisma.vehicleAssignment.findFirst({ where: { vehicleId, papel, encerradoEm: null } }),
    );
  }

  async encerraCurrent(vehicleId: string, papel: VehicleAssignmentRole): Promise<void> {
    await this.prisma.withTenant(
      this.prisma.vehicleAssignment.updateMany({
        where: { vehicleId, papel, encerradoEm: null },
        data: { encerradoEm: new Date() },
      }),
    );
  }

  listHistoryByVehicle(vehicleId: string): Promise<VehicleAssignment[]> {
    return this.prisma.withTenant(
      this.prisma.vehicleAssignment.findMany({
        where: { vehicleId },
        orderBy: { iniciadoEm: "desc" },
      }),
    );
  }

  /**
   * Consultado pelo próprio Motorista/Monitor autenticado ("Meu
   * Veículo" no app) — usa `withBypass` porque a RLS de
   * `vehicle_assignments` é por `companyId` do VEÍCULO, mas aqui a
   * pergunta legítima é "a qual veículo EU (usuário já autenticado)
   * estou vinculado", independente de qual tenant é o dono — mesmo
   * padrão de `PrismaMembershipRepository.listActiveByUserWithCompany`.
   */
  async findCurrentVehicleIdForUser(
    userId: string,
    papel: VehicleAssignmentRole,
  ): Promise<string | null> {
    const assignment = await this.prisma.withBypass(
      this.prisma.vehicleAssignment.findFirst({
        where: { userId, papel, encerradoEm: null },
        orderBy: { iniciadoEm: "desc" },
      }),
    );
    return assignment?.vehicleId ?? null;
  }
}
