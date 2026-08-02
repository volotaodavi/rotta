import type { PasswordResetToken } from "@prisma/client";

/** Repository Pattern (Dossie 12, Secao 6.1) — tabela global, sem RLS. */
export interface CreatePasswordResetTokenInput {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
}

export interface PasswordResetTokenRepository {
  create(input: CreatePasswordResetTokenInput): Promise<PasswordResetToken>;
  findByTokenHash(tokenHash: string): Promise<PasswordResetToken | null>;
  markUsed(id: string): Promise<void>;
  invalidateAllForUser(userId: string): Promise<void>;
}
