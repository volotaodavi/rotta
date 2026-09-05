import { Injectable } from "@nestjs/common";

import type {
  CreateSchoolCompanyLinkData,
  SchoolCompanyLinkRepository,
} from "./school-company-link.repository";
import type { SchoolCompanyLink } from "@prisma/client";

import { PrismaService } from "@/infra/database/prisma.service";

@Injectable()
export class PrismaSchoolCompanyLinkRepository implements SchoolCompanyLinkRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: CreateSchoolCompanyLinkData): Promise<SchoolCompanyLink> {
    return this.prisma.withTenant(this.prisma.schoolCompanyLink.create({ data }));
  }

  findActiveByCompanyAndSchool(
    companyId: string,
    schoolId: string,
  ): Promise<SchoolCompanyLink | null> {
    return this.prisma.withTenant(
      this.prisma.schoolCompanyLink.findFirst({
        where: { companyId, schoolId, desvinculadoEm: null },
      }),
    );
  }

  encerra(id: string, encerradoPorId: string): Promise<SchoolCompanyLink> {
    return this.prisma.withTenant(
      this.prisma.schoolCompanyLink.update({
        where: { id },
        data: { desvinculadoEm: new Date(), encerradoPorId },
      }),
    );
  }

  listActiveByCompany(companyId: string): Promise<SchoolCompanyLink[]> {
    return this.prisma.withTenant(
      this.prisma.schoolCompanyLink.findMany({
        where: { companyId, desvinculadoEm: null },
      }),
    );
  }

  /**
   * Bypass deliberado: "quais empresas atendem esta escola" atravessa
   * tenants por natureza (mesmo padrão de `VehicleRepository.findByPlaca`)
   * — usado pelo Admin Rotta (dashboard/moderação) e por
   * `SchoolsService` para decidir RBAC de Motorista/Monitor sem
   * expor os dados de nenhuma empresa específica ao chamador.
   */
  findActiveForSchool(schoolId: string): Promise<SchoolCompanyLink[]> {
    return this.prisma.withBypass(
      this.prisma.schoolCompanyLink.findMany({
        where: { schoolId, desvinculadoEm: null },
      }),
    );
  }
}
