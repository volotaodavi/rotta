import { Injectable } from "@nestjs/common";


import type {
  CompanyJoinRequestRepository,
  CompanyJoinRequestWithCompany,
  CompanyJoinRequestWithUser,
  CreateCompanyJoinRequestData,
  DecideCompanyJoinRequestData,
} from "./company-join-request.repository";
import type { CompanyJoinRequest } from "@prisma/client";

import { PrismaService } from "@/infra/database/prisma.service";

const companyInclude = { company: { select: { id: true, nomeFantasia: true } } } as const;

const withUserInclude = {
  company: { select: { id: true, nomeFantasia: true } },
  user: { select: { id: true, nome: true, email: true, telefone: true } },
} as const;

@Injectable()
export class PrismaCompanyJoinRequestRepository implements CompanyJoinRequestRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: CreateCompanyJoinRequestData): Promise<CompanyJoinRequestWithCompany> {
    return this.prisma.withBypass(
      this.prisma.companyJoinRequest.create({ data, include: companyInclude }),
    );
  }

  findLatestByUser(userId: string): Promise<CompanyJoinRequestWithCompany | null> {
    return this.prisma.withBypass(
      this.prisma.companyJoinRequest.findFirst({
        where: { userId },
        include: companyInclude,
        orderBy: { createdAt: "desc" },
      }),
    );
  }

  findById(id: string): Promise<CompanyJoinRequestWithUser | null> {
    return this.prisma.withBypass(
      this.prisma.companyJoinRequest.findUnique({ where: { id }, include: withUserInclude }),
    );
  }

  findPendingByCompany(companyId: string): Promise<CompanyJoinRequestWithUser[]> {
    return this.prisma.withTenant(
      this.prisma.companyJoinRequest.findMany({
        where: { companyId, status: "PENDENTE" },
        include: withUserInclude,
        orderBy: { createdAt: "asc" },
      }),
    );
  }

  decide(id: string, data: DecideCompanyJoinRequestData): Promise<CompanyJoinRequest> {
    return this.prisma.withTenant(this.prisma.companyJoinRequest.update({ where: { id }, data }));
  }
}
