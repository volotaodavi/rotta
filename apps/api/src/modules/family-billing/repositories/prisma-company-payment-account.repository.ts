import { Injectable } from "@nestjs/common";

import type {
  CompanyPaymentAccountRepository,
  UpsertCompanyPaymentAccountData,
} from "./company-payment-account.repository";
import type { CompanyPaymentAccount } from "@prisma/client";

import { PrismaService } from "@/infra/database/prisma.service";

@Injectable()
export class PrismaCompanyPaymentAccountRepository implements CompanyPaymentAccountRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByCompanyId(companyId: string): Promise<CompanyPaymentAccount | null> {
    return this.prisma.withTenant(
      this.prisma.companyPaymentAccount.findUnique({ where: { companyId } }),
    );
  }

  upsert(companyId: string, data: UpsertCompanyPaymentAccountData): Promise<CompanyPaymentAccount> {
    return this.prisma.withTenant(
      this.prisma.companyPaymentAccount.upsert({
        where: { companyId },
        create: { companyId, ...data },
        update: data,
      }),
    );
  }

  findByCompanyIdAcrossTenants(companyId: string): Promise<CompanyPaymentAccount | null> {
    return this.prisma.withBypass(
      this.prisma.companyPaymentAccount.findUnique({ where: { companyId } }),
    );
  }

  findByAsaasAccountIdAcrossTenants(asaasAccountId: string): Promise<CompanyPaymentAccount | null> {
    return this.prisma.withBypass(
      this.prisma.companyPaymentAccount.findFirst({ where: { asaasAccountId } }),
    );
  }

  upsertAcrossTenants(
    companyId: string,
    data: UpsertCompanyPaymentAccountData,
  ): Promise<CompanyPaymentAccount> {
    return this.prisma.withBypass(
      this.prisma.companyPaymentAccount.upsert({
        where: { companyId },
        create: { companyId, ...data },
        update: data,
      }),
    );
  }
}
