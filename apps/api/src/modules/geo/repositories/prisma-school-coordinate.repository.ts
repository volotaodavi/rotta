import { Injectable } from "@nestjs/common";


import type {
  CreateSchoolCoordinateData,
  SchoolCoordinateRepository,
} from "./school-coordinate.repository";
import type { SchoolCoordinate, SchoolCoordinateStatus } from "@prisma/client";

import { PrismaService } from "@/infra/database/prisma.service";

/**
 * `school_coordinates` não tem RLS (mesma razão de `School`/
 * `SchoolAccessPoint` — é histórico de um catálogo compartilhado, não
 * um dado de tenant) — chamadas diretas ao Prisma, sem `withTenant`.
 */
@Injectable()
export class PrismaSchoolCoordinateRepository implements SchoolCoordinateRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: CreateSchoolCoordinateData): Promise<SchoolCoordinate> {
    return this.prisma.schoolCoordinate.create({ data });
  }

  findById(id: string): Promise<SchoolCoordinate | null> {
    return this.prisma.schoolCoordinate.findUnique({ where: { id } });
  }

  updateStatus(
    id: string,
    status: SchoolCoordinateStatus,
    input: { validadoPorIa: boolean; motivoRevisao?: string },
  ): Promise<SchoolCoordinate> {
    return this.prisma.schoolCoordinate.update({
      where: { id },
      data: { status, validadoPorIa: input.validadoPorIa, motivoRevisao: input.motivoRevisao },
    });
  }

  findLatestBySchoolId(schoolId: string): Promise<SchoolCoordinate | null> {
    return this.prisma.schoolCoordinate.findFirst({
      where: { schoolId },
      orderBy: { createdAt: "desc" },
    });
  }

  listBySchoolId(schoolId: string): Promise<SchoolCoordinate[]> {
    return this.prisma.schoolCoordinate.findMany({
      where: { schoolId },
      orderBy: { createdAt: "desc" },
    });
  }

  listByStatus(status: SchoolCoordinateStatus): Promise<SchoolCoordinate[]> {
    return this.prisma.schoolCoordinate.findMany({
      where: { status },
      orderBy: { createdAt: "asc" },
    });
  }
}
