import type { Prisma, Session } from "@prisma/client";

/**
 * Repository Pattern (Dossie 12, Secao 6.1) — `sessions` e tabela global
 * (sem RLS por tenant, mesma razao de `users`, Dossie 8 Secao 2): uma
 * sessao pertence a um `User`, nao a uma `Company`.
 */
export interface CreateSessionInput {
  userId: string;
  refreshTokenHash: string;
  deviceName?: string;
  ip?: string;
  userAgent?: string;
  expiresAt: Date;
  tenantId: string | null;
  role: string;
  vinculoId: string;
}

export interface SessionRepository {
  create(input: CreateSessionInput, tx?: Prisma.TransactionClient): Promise<Session>;
  findByRefreshTokenHash(refreshTokenHash: string): Promise<Session | null>;
  findById(id: string): Promise<Session | null>;
  listActiveByUser(userId: string): Promise<Session[]>;
  revoke(id: string, tx?: Prisma.TransactionClient): Promise<Session>;
  revokeAllForUser(userId: string, exceptId?: string, tx?: Prisma.TransactionClient): Promise<void>;
  touchLastUsedAt(id: string): Promise<void>;
}
