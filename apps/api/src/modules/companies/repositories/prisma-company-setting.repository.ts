import { Injectable } from "@nestjs/common";


import type { CompanySettingEntry, CompanySettingRepository } from "./company-setting.repository";
import type { CompanySetting } from "@prisma/client";

import { PrismaService } from "@/infra/database/prisma.service";

@Injectable()
export class PrismaCompanySettingRepository implements CompanySettingRepository {
  constructor(private readonly prisma: PrismaService) {}

  async upsertMany(companyId: string, entries: CompanySettingEntry[]): Promise<void> {
    await Promise.all(
      entries.map((entry) =>
        this.prisma.withTenant(
          this.prisma.companySetting.upsert({
            where: { companyId_chave: { companyId, chave: entry.chave } },
            create: { companyId, chave: entry.chave, tipo: entry.tipo, valor: entry.valor },
            update: { tipo: entry.tipo, valor: entry.valor },
          }),
        ),
      ),
    );
  }

  listByCompany(companyId: string): Promise<CompanySetting[]> {
    return this.prisma.withTenant(this.prisma.companySetting.findMany({ where: { companyId } }));
  }
}
