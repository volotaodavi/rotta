import { Injectable } from "@nestjs/common";

import type { CreateMembershipInput, MembershipRepository } from "./membership.repository";
import type { Membership, MembershipStatus, Prisma } from "@prisma/client";

import { PrismaService } from "@/infra/database/prisma.service";

/**
 * `memberships` tem RLS por `companyId` (Dossie 8, Secao 1) — toda
 * operacao passa por `this.prisma.withTenant(...)`, nunca chamando
 * `this.prisma.membership.*` diretamente (ver nota critica em
 * `prisma.service.ts`).
 */
@Injectable()
export class PrismaMembershipRepository implements MembershipRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(input: CreateMembershipInput, tx?: Prisma.TransactionClient): Promise<Membership> {
    if (tx) {
      return tx.membership.create({ data: input });
    }
    return this.prisma.withTenant(this.prisma.membership.create({ data: input }));
  }

  findActive(userId: string, companyId: string): Promise<Membership | null> {
    return this.prisma.withTenant(
      this.prisma.membership.findFirst({ where: { userId, companyId, status: "ATIVO" } }),
    );
  }

  listByCompany(companyId: string): Promise<Membership[]> {
    return this.prisma.withTenant(
      this.prisma.membership.findMany({ where: { companyId }, orderBy: { iniciadoEm: "asc" } }),
    );
  }

  updateStatus(id: string, status: MembershipStatus): Promise<Membership> {
    return this.prisma.withTenant(
      this.prisma.membership.update({
        where: { id },
        data: { status, encerradoEm: status === "ATIVO" ? null : new Date() },
      }),
    );
  }
}
