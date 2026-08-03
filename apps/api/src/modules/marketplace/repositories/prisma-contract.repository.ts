import { Injectable } from "@nestjs/common";


import type {
  ContractAccessScope,
  ContractRepository,
  CreateContractData,
  ListContractsFilter,
  ListContractsResult,
} from "./contract.repository";
import type { Contract, Prisma } from "@prisma/client";

import { PrismaService } from "@/infra/database/prisma.service";

function scopeWhere(scope: ContractAccessScope): Prisma.ContractWhereInput {
  return {
    ...(scope.responsavelId ? { responsavelId: scope.responsavelId } : {}),
    ...(scope.companyId ? { companyId: scope.companyId } : {}),
  };
}

@Injectable()
export class PrismaContractRepository implements ContractRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: CreateContractData): Promise<Contract> {
    return this.prisma.withTenant(this.prisma.contract.create({ data }));
  }

  findByTransportRequestId(transportRequestId: string): Promise<Contract | null> {
    return this.prisma.withTenant(
      this.prisma.contract.findFirst({ where: { transportRequestId } }),
    );
  }

  async findByIdScoped(id: string, scope: ContractAccessScope): Promise<Contract | null> {
    const where: Prisma.ContractWhereInput = { id, ...scopeWhere(scope) };
    return scope.responsavelId
      ? this.prisma.withBypass(this.prisma.contract.findFirst({ where }))
      : this.prisma.withTenant(this.prisma.contract.findFirst({ where }));
  }

  findById(id: string): Promise<Contract | null> {
    return this.prisma.withTenant(this.prisma.contract.findFirst({ where: { id } }));
  }

  updateAsEmpresa(id: string, data: Partial<Contract>): Promise<Contract> {
    return this.prisma.withTenant(this.prisma.contract.update({ where: { id }, data }));
  }

  updateAsResponsavel(id: string, data: Partial<Contract>): Promise<Contract> {
    return this.prisma.withBypass(this.prisma.contract.update({ where: { id }, data }));
  }

  activate(id: string): Promise<Contract> {
    return this.prisma.withBypass(
      this.prisma.contract.update({
        where: { id },
        data: { status: "ATIVO", ativadoEm: new Date() },
      }),
    );
  }

  async list(filter: ListContractsFilter): Promise<ListContractsResult> {
    const where: Prisma.ContractWhereInput = scopeWhere(filter);

    const findMany = () =>
      this.prisma.contract.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (filter.page - 1) * filter.pageSize,
        take: filter.pageSize,
      });
    const count = () => this.prisma.contract.count({ where });

    const [items, total] = filter.responsavelId
      ? await Promise.all([this.prisma.withBypass(findMany()), this.prisma.withBypass(count())])
      : await Promise.all([this.prisma.withTenant(findMany()), this.prisma.withTenant(count())]);

    return { items, total };
  }
}
