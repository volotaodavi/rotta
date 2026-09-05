import { Injectable } from "@nestjs/common";

import type { CreateSessionInput, SessionRepository } from "./session.repository";
import type { Prisma, Session } from "@prisma/client";

import { PrismaService } from "@/infra/database/prisma.service";

@Injectable()
export class PrismaSessionRepository implements SessionRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(input: CreateSessionInput, tx?: Prisma.TransactionClient): Promise<Session> {
    return (tx ?? this.prisma).session.create({ data: input });
  }

  findByRefreshTokenHash(refreshTokenHash: string): Promise<Session | null> {
    return this.prisma.session.findUnique({ where: { refreshTokenHash } });
  }

  findById(id: string): Promise<Session | null> {
    return this.prisma.session.findUnique({ where: { id } });
  }

  listActiveByUser(userId: string): Promise<Session[]> {
    return this.prisma.session.findMany({
      where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { lastUsedAt: "desc" },
    });
  }

  async revoke(id: string, tx?: Prisma.TransactionClient): Promise<Session> {
    return (tx ?? this.prisma).session.update({ where: { id }, data: { revokedAt: new Date() } });
  }

  async revokeAllForUser(
    userId: string,
    exceptId?: string,
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    await (tx ?? this.prisma).session.updateMany({
      where: { userId, revokedAt: null, ...(exceptId ? { id: { not: exceptId } } : {}) },
      data: { revokedAt: new Date() },
    });
  }

  async touchLastUsedAt(id: string): Promise<void> {
    await this.prisma.session.update({ where: { id }, data: { lastUsedAt: new Date() } });
  }
}
