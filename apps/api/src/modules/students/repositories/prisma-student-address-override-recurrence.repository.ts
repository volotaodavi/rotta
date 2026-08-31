import { Injectable } from "@nestjs/common";

import type {
  CreateStudentAddressOverrideRecurrenceData,
  StudentAddressOverrideRecurrenceRepository,
} from "./student-address-override-recurrence.repository";
import type { StudentAddressOverrideRecurrence } from "@prisma/client";

import { PrismaService } from "@/infra/database/prisma.service";

@Injectable()
export class PrismaStudentAddressOverrideRecurrenceRepository implements StudentAddressOverrideRecurrenceRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(
    data: CreateStudentAddressOverrideRecurrenceData,
  ): Promise<StudentAddressOverrideRecurrence> {
    return this.prisma.studentAddressOverrideRecurrence.create({ data });
  }

  findById(id: string): Promise<StudentAddressOverrideRecurrence | null> {
    return this.prisma.studentAddressOverrideRecurrence.findUnique({ where: { id } });
  }

  listByStudent(studentId: string): Promise<StudentAddressOverrideRecurrence[]> {
    return this.prisma.studentAddressOverrideRecurrence.findMany({
      where: { studentId },
      orderBy: { createdAt: "desc" },
    });
  }

  async remove(id: string): Promise<void> {
    await this.prisma.studentAddressOverrideRecurrence.delete({ where: { id } });
  }
}
