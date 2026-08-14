import { Injectable } from "@nestjs/common";

import type {
  ClaimStudentPreRegistrationData,
  CreateStudentPreRegistrationData,
  StudentPreRegistrationRepository,
  StudentPreRegistrationWithCompany,
} from "./student-pre-registration.repository";
import type { StudentPreRegistration } from "@prisma/client";

import { PrismaService } from "@/infra/database/prisma.service";

const companyInclude = { company: { select: { id: true, nomeFantasia: true } } } as const;

@Injectable()
export class PrismaStudentPreRegistrationRepository implements StudentPreRegistrationRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: CreateStudentPreRegistrationData): Promise<StudentPreRegistration> {
    return this.prisma.withTenant(this.prisma.studentPreRegistration.create({ data }));
  }

  listByCompany(companyId: string): Promise<StudentPreRegistration[]> {
    return this.prisma.withTenant(
      this.prisma.studentPreRegistration.findMany({
        where: { companyId },
        orderBy: { createdAt: "desc" },
      }),
    );
  }

  findById(id: string): Promise<StudentPreRegistration | null> {
    return this.prisma.withTenant(this.prisma.studentPreRegistration.findUnique({ where: { id } }));
  }

  cancel(id: string): Promise<StudentPreRegistration> {
    return this.prisma.withTenant(
      this.prisma.studentPreRegistration.update({ where: { id }, data: { status: "CANCELADO" } }),
    );
  }

  findPendingByCompanyAndCelular(
    companyId: string,
    celularResponsavel: string,
  ): Promise<StudentPreRegistrationWithCompany | null> {
    return this.prisma.withBypass(
      this.prisma.studentPreRegistration.findFirst({
        where: { companyId, celularResponsavel, status: "PENDENTE" },
        include: companyInclude,
        orderBy: { createdAt: "desc" },
      }),
    );
  }

  findByIdWithCompany(id: string): Promise<StudentPreRegistrationWithCompany | null> {
    return this.prisma.withBypass(
      this.prisma.studentPreRegistration.findUnique({ where: { id }, include: companyInclude }),
    );
  }

  claim(id: string, data: ClaimStudentPreRegistrationData): Promise<StudentPreRegistration> {
    return this.prisma.withBypass(
      this.prisma.studentPreRegistration.update({ where: { id }, data }),
    );
  }

  markConcluded(id: string, studentId: string): Promise<StudentPreRegistration> {
    return this.prisma.withBypass(
      this.prisma.studentPreRegistration.update({
        where: { id },
        data: { status: "CONCLUIDO", studentId },
      }),
    );
  }
}
