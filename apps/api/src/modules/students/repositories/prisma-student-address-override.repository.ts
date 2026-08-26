import { Injectable } from "@nestjs/common";

import type {
  StudentAddressOverrideRepository,
  UpsertStudentAddressOverrideData,
} from "./student-address-override.repository";
import type { StudentAddressOverride } from "@prisma/client";

import { PrismaService } from "@/infra/database/prisma.service";

@Injectable()
export class PrismaStudentAddressOverrideRepository implements StudentAddressOverrideRepository {
  constructor(private readonly prisma: PrismaService) {}

  upsert(data: UpsertStudentAddressOverrideData): Promise<StudentAddressOverride> {
    const { studentId, data: dia, ...resto } = data;
    return this.prisma.studentAddressOverride.upsert({
      where: { studentId_data: { studentId, data: dia } },
      create: { studentId, data: dia, ...resto },
      update: { ...resto },
    });
  }

  findById(id: string): Promise<StudentAddressOverride | null> {
    return this.prisma.studentAddressOverride.findUnique({ where: { id } });
  }

  findByStudentAndDate(studentId: string, data: Date): Promise<StudentAddressOverride | null> {
    return this.prisma.studentAddressOverride.findUnique({
      where: { studentId_data: { studentId, data } },
    });
  }

  listByStudent(studentId: string, from?: Date, to?: Date): Promise<StudentAddressOverride[]> {
    return this.prisma.studentAddressOverride.findMany({
      where: {
        studentId,
        ...((from ?? to) && { data: { gte: from, lte: to } }),
      },
      orderBy: { data: "asc" },
    });
  }

  async remove(id: string): Promise<void> {
    await this.prisma.studentAddressOverride.delete({ where: { id } });
  }
}
