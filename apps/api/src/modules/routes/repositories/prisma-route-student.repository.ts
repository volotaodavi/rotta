import { Injectable } from "@nestjs/common";

import type {
  CreateRouteStudentData,
  RouteStudentRepository,
  UpdateRouteStudentData,
} from "./route-student.repository";
import type { RouteStudent } from "@prisma/client";

import { PrismaService } from "@/infra/database/prisma.service";

@Injectable()
export class PrismaRouteStudentRepository implements RouteStudentRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: CreateRouteStudentData): Promise<RouteStudent> {
    return this.prisma.withTenant(this.prisma.routeStudent.create({ data }));
  }

  findById(id: string): Promise<RouteStudent | null> {
    return this.prisma.withTenant(this.prisma.routeStudent.findUnique({ where: { id } }));
  }

  findByContractId(contractId: string): Promise<RouteStudent | null> {
    return this.prisma.withTenant(this.prisma.routeStudent.findUnique({ where: { contractId } }));
  }

  update(id: string, data: UpdateRouteStudentData): Promise<RouteStudent> {
    return this.prisma.withTenant(this.prisma.routeStudent.update({ where: { id }, data }));
  }

  listByRoute(routeId: string): Promise<RouteStudent[]> {
    return this.prisma.withTenant(
      this.prisma.routeStudent.findMany({ where: { routeId, ativo: true } }),
    );
  }

  listActiveByStudentAcrossTenants(
    studentId: string,
  ): Promise<(RouteStudent & { route: { turno: string; companyId: string } })[]> {
    return this.prisma.withBypass(
      this.prisma.routeStudent.findMany({
        where: { studentId, ativo: true },
        include: { route: { select: { turno: true, companyId: true } } },
      }),
    );
  }

  async delete(id: string): Promise<void> {
    await this.prisma.withTenant(this.prisma.routeStudent.delete({ where: { id } }));
  }
}
