import { Injectable } from "@nestjs/common";

import type {
  CreateStudentAuthorizedPersonData,
  StudentAuthorizedPersonRepository,
} from "./student-authorized-person.repository";
import type { StudentAuthorizedPerson } from "@prisma/client";

import { PrismaService } from "@/infra/database/prisma.service";

@Injectable()
export class PrismaStudentAuthorizedPersonRepository implements StudentAuthorizedPersonRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: CreateStudentAuthorizedPersonData): Promise<StudentAuthorizedPerson> {
    return this.prisma.studentAuthorizedPerson.create({ data });
  }

  listByStudent(studentId: string): Promise<StudentAuthorizedPerson[]> {
    return this.prisma.studentAuthorizedPerson.findMany({ where: { studentId } });
  }

  findById(id: string): Promise<StudentAuthorizedPerson | null> {
    return this.prisma.studentAuthorizedPerson.findUnique({ where: { id } });
  }

  async remove(id: string): Promise<void> {
    await this.prisma.studentAuthorizedPerson.delete({ where: { id } });
  }
}
