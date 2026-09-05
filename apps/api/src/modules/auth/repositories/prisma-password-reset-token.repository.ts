import { Injectable } from "@nestjs/common";

import type {
  CreatePasswordResetTokenInput,
  PasswordResetTokenRepository,
} from "./password-reset-token.repository";
import type { PasswordResetToken } from "@prisma/client";

import { PrismaService } from "@/infra/database/prisma.service";

@Injectable()
export class PrismaPasswordResetTokenRepository implements PasswordResetTokenRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(input: CreatePasswordResetTokenInput): Promise<PasswordResetToken> {
    return this.prisma.passwordResetToken.create({ data: input });
  }

  findByTokenHash(tokenHash: string): Promise<PasswordResetToken | null> {
    return this.prisma.passwordResetToken.findUnique({ where: { tokenHash } });
  }

  async markUsed(id: string): Promise<void> {
    await this.prisma.passwordResetToken.update({ where: { id }, data: { usedAt: new Date() } });
  }

  /**
   * "Apenas o link mais recente é válido" (Dossiê 15, `AUTH-03`, casos
   * excepcionais) — modelado como marcar os tokens anteriores como já
   * usados (mesmo efeito prático de invalidação, sem precisar de uma
   * segunda coluna `invalidatedAt` só para essa distinção).
   */
  async invalidateAllForUser(userId: string): Promise<void> {
    await this.prisma.passwordResetToken.updateMany({
      where: { userId, usedAt: null },
      data: { usedAt: new Date() },
    });
  }
}
