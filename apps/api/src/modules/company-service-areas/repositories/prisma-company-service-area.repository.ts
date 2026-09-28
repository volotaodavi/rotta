import { Injectable } from "@nestjs/common";

import type {
  CompanyServiceAreaCerca,
  CompanyServiceAreaRepository,
  CompanyServiceAreaWithSchool,
  CreateCompanyServiceAreaData,
} from "./company-service-area.repository";

import { PrismaService } from "@/infra/database/prisma.service";

/** O porquê do bypass em todo método está na interface. */
@Injectable()
export class PrismaCompanyServiceAreaRepository implements CompanyServiceAreaRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: CreateCompanyServiceAreaData): Promise<CompanyServiceAreaWithSchool> {
    return this.prisma.withBypass(
      this.prisma.companyServiceArea.create({
        data,
        include: { school: { select: { nomeOficial: true, nomeFantasia: true } } },
      }),
    );
  }

  listByCompany(companyId: string): Promise<CompanyServiceAreaWithSchool[]> {
    return this.prisma.withBypass(
      this.prisma.companyServiceArea.findMany({
        where: { companyId },
        include: { school: { select: { nomeOficial: true, nomeFantasia: true } } },
        orderBy: { createdAt: "asc" },
      }),
    );
  }

  listCercasByCompany(companyId: string): Promise<CompanyServiceAreaCerca[]> {
    return this.prisma.withBypass(
      this.prisma.companyServiceArea.findMany({
        where: { companyId },
        select: { cidade: true, estado: true, schoolId: true, dependencias: true },
      }),
    );
  }

  async listCidadesByCompanyAndEstado(
    companyId: string,
    estado: string,
  ): Promise<(string | null)[]> {
    const areas = await this.prisma.withBypass(
      this.prisma.companyServiceArea.findMany({
        where: { companyId, estado },
        select: { cidade: true },
      }),
    );
    return areas.map((area) => area.cidade);
  }

  async deleteByIdAndCompany(areaId: string, companyId: string): Promise<void> {
    await this.prisma.withBypass(
      this.prisma.companyServiceArea.deleteMany({ where: { id: areaId, companyId } }),
    );
  }
}
