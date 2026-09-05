import { Injectable } from "@nestjs/common";

import type {
  CreateSchoolAccessPointData,
  SchoolAccessPointRepository,
  UpdateSchoolAccessPointData,
} from "./school-access-point.repository";
import type { SchoolAccessPoint } from "@prisma/client";

import { PrismaService } from "@/infra/database/prisma.service";

/** `school_access_points` sem RLS — mesma razão de `PrismaSchoolRepository`. */
@Injectable()
export class PrismaSchoolAccessPointRepository implements SchoolAccessPointRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: CreateSchoolAccessPointData): Promise<SchoolAccessPoint> {
    return this.prisma.schoolAccessPoint.create({ data });
  }

  findById(id: string): Promise<SchoolAccessPoint | null> {
    return this.prisma.schoolAccessPoint.findUnique({ where: { id } });
  }

  update(id: string, data: UpdateSchoolAccessPointData): Promise<SchoolAccessPoint> {
    return this.prisma.schoolAccessPoint.update({ where: { id }, data });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.schoolAccessPoint.delete({ where: { id } });
  }

  listBySchool(schoolId: string): Promise<SchoolAccessPoint[]> {
    return this.prisma.schoolAccessPoint.findMany({
      where: { schoolId },
      orderBy: [{ tipo: "asc" }, { nome: "asc" }],
    });
  }
}
