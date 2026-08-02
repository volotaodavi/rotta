import { Injectable } from "@nestjs/common";


import type { CreateInviteInput, InviteRepository, InviteWithCompany } from "./invite.repository";
import type { Invite, Prisma } from "@prisma/client";

import { PrismaService } from "@/infra/database/prisma.service";

@Injectable()
export class PrismaInviteRepository implements InviteRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(input: CreateInviteInput, tx?: Prisma.TransactionClient): Promise<Invite> {
    if (tx) {
      return tx.invite.create({ data: input });
    }
    return this.prisma.withTenant(this.prisma.invite.create({ data: input }));
  }

  /**
   * Unica leitura chamada FORA de um tenant conhecido (resgate publico
   * de convite) — o `tx` recebido aqui, quando presente, ja vem de
   * `PrismaService.runInBypassTransaction` (ver `InvitesService.redeem`).
   */
  findByCodigo(codigo: string, tx?: Prisma.TransactionClient): Promise<InviteWithCompany | null> {
    if (tx) {
      return tx.invite.findUnique({ where: { codigo }, include: { company: true } });
    }
    return this.prisma.withTenant(
      this.prisma.invite.findUnique({ where: { codigo }, include: { company: true } }),
    );
  }

  listActiveByCompany(companyId: string): Promise<Invite[]> {
    return this.prisma.withTenant(
      this.prisma.invite.findMany({
        where: { companyId, usadoEm: null, revogadoEm: null, expiresAt: { gt: new Date() } },
        orderBy: { createdAt: "desc" },
      }),
    );
  }

  markUsed(id: string, usadoPorId: string, tx?: Prisma.TransactionClient): Promise<Invite> {
    const data = { usadoEm: new Date(), usadoPorId };
    if (tx) {
      return tx.invite.update({ where: { id }, data });
    }
    return this.prisma.withTenant(this.prisma.invite.update({ where: { id }, data }));
  }

  revoke(id: string): Promise<Invite> {
    return this.prisma.withTenant(
      this.prisma.invite.update({ where: { id }, data: { revogadoEm: new Date() } }),
    );
  }
}
