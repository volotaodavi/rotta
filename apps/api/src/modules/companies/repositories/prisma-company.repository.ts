import { Injectable } from "@nestjs/common";

import type {
  CompanyRepository,
  CompanyWithPlan,
  CreateCompanyData,
  ListCompaniesFilter,
  ListCompaniesResult,
  UpdateCompanyData,
} from "./company.repository";
import type { Company, Prisma } from "@prisma/client";

import { PrismaService } from "@/infra/database/prisma.service";

/**
 * `companies` tem RLS pela própria `id` (Dossiê 8, Seção 1) — toda
 * operação passa por `this.prisma.withTenant(...)` (ver nota crítica em
 * `prisma.service.ts`). Defesa em profundidade (Dossiê 8, Seção 1.2,
 * "camada de aplicação"): mesmo com a RLS já restringindo linhas por
 * tenant, `findById`/`list` também filtram `deletedAt: null`
 * explicitamente por padrão — nunca dependem apenas do banco.
 */
@Injectable()
export class PrismaCompanyRepository implements CompanyRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: CreateCompanyData, tx?: Prisma.TransactionClient): Promise<CompanyWithPlan> {
    if (tx) {
      return tx.company.create({ data, include: { plan: true } });
    }
    return this.prisma.withTenant(this.prisma.company.create({ data, include: { plan: true } }));
  }

  findById(id: string): Promise<CompanyWithPlan | null> {
    return this.prisma.withTenant(
      this.prisma.company.findFirst({ where: { id, deletedAt: null }, include: { plan: true } }),
    );
  }

  findByCpfCnpj(cpfCnpj: string): Promise<Company | null> {
    return this.prisma.withTenant(this.prisma.company.findFirst({ where: { cpfCnpj } }));
  }

  async nextCodigoInternoSequence(): Promise<number> {
    const [result] = await this.prisma.$queryRaw<
      { nextval: bigint }[]
    >`SELECT nextval('companies_codigo_interno_seq')`;
    if (!result) {
      throw new Error("Falha ao gerar código interno da empresa (sequência indisponível).");
    }
    return Number(result.nextval);
  }

  findActiveByCodigoInterno(codigoInterno: string): Promise<Company | null> {
    // "ATIVO" (não SUSPENSO/CANCELADO) — ver o porquê de não ser
    // literalmente `status: "ATIVO"` no doc da interface.
    return this.prisma.withBypass(
      this.prisma.company.findFirst({
        where: { codigoInterno, status: { notIn: ["SUSPENSO", "CANCELADO"] }, deletedAt: null },
      }),
    );
  }

  update(id: string, data: UpdateCompanyData): Promise<CompanyWithPlan> {
    return this.prisma.withTenant(
      this.prisma.company.update({ where: { id }, data, include: { plan: true } }),
    );
  }

  async list(filter: ListCompaniesFilter): Promise<ListCompaniesResult> {
    const where: Prisma.CompanyWhereInput = {
      deletedAt: filter.includeDeleted ? undefined : null,
      ...(filter.status ? { status: filter.status } : {}),
      ...(filter.tipo ? { tipo: filter.tipo } : {}),
      ...(filter.search
        ? {
            OR: [
              { razaoSocial: { contains: filter.search, mode: "insensitive" } },
              { nomeFantasia: { contains: filter.search, mode: "insensitive" } },
              { cpfCnpj: { contains: filter.search } },
              { email: { contains: filter.search, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.withTenant(
        this.prisma.company.findMany({
          where,
          include: { plan: true },
          orderBy: { [filter.sortBy]: filter.sortOrder },
          skip: (filter.page - 1) * filter.pageSize,
          take: filter.pageSize,
        }),
      ),
      this.prisma.withTenant(this.prisma.company.count({ where })),
    ]);

    return { items, total };
  }
}
