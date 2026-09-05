import { Injectable } from "@nestjs/common";

import type {
  CompanyJoinPreRegistrationRepository,
  CreateCompanyJoinPreRegistrationData,
  MarkVinculadoData,
  MatchCompanyJoinPreRegistrationCriteria,
} from "./company-join-pre-registration.repository";
import type { CompanyJoinPreRegistration, Prisma } from "@prisma/client";

import { PrismaService } from "@/infra/database/prisma.service";

@Injectable()
export class PrismaCompanyJoinPreRegistrationRepository implements CompanyJoinPreRegistrationRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: CreateCompanyJoinPreRegistrationData): Promise<CompanyJoinPreRegistration> {
    return this.prisma.withTenant(this.prisma.companyJoinPreRegistration.create({ data }));
  }

  listByCompany(companyId: string): Promise<CompanyJoinPreRegistration[]> {
    return this.prisma.withTenant(
      this.prisma.companyJoinPreRegistration.findMany({
        where: { companyId },
        orderBy: { createdAt: "desc" },
      }),
    );
  }

  findById(id: string): Promise<CompanyJoinPreRegistration | null> {
    return this.prisma.withTenant(
      this.prisma.companyJoinPreRegistration.findUnique({ where: { id } }),
    );
  }

  cancel(id: string): Promise<CompanyJoinPreRegistration> {
    return this.prisma.withTenant(
      this.prisma.companyJoinPreRegistration.update({
        where: { id },
        data: { status: "CANCELADO" },
      }),
    );
  }

  findMatchingPending(
    companyId: string,
    role: string,
    criteria: MatchCompanyJoinPreRegistrationCriteria,
  ): Promise<CompanyJoinPreRegistration | null> {
    const or: Prisma.CompanyJoinPreRegistrationWhereInput[] = [];
    if (criteria.celular) {
      or.push({ celular: criteria.celular });
    }
    if (criteria.nome) {
      or.push({ nome: { equals: criteria.nome, mode: "insensitive" } });
    }
    if (or.length === 0) {
      return Promise.resolve(null);
    }

    return this.prisma.withBypass(
      this.prisma.companyJoinPreRegistration.findFirst({
        where: { companyId, role, status: "PENDENTE", OR: or },
        orderBy: { createdAt: "asc" },
      }),
    );
  }

  markVinculado(id: string, data: MarkVinculadoData): Promise<CompanyJoinPreRegistration> {
    return this.prisma.withBypass(
      this.prisma.companyJoinPreRegistration.update({
        where: { id },
        data: { status: "VINCULADO", ...data },
      }),
    );
  }
}
