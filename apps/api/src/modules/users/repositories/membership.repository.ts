import type { Membership, MembershipStatus, Prisma } from "@prisma/client";

/**
 * `Membership` = `VinculoPapel` do Dossie 8, Secao 2 — liga `User` +
 * `Company` (tenant) + papel. Tabela COM RLS por `companyId` (Dossie 8
 * Secao 1.2) — toda operacao aqui roda dentro do contexto de tenant (ou
 * bypass de Admin Rotta) ja definido pelo `TenantGuard`.
 */
export interface CreateMembershipInput {
  userId: string;
  companyId: string;
  role: string;
  convidadoPorId?: string;
}

export interface MembershipRepository {
  /** `tx` opcional: usado quando a criação precisa ser atômica com outras escritas (ex. Dossiê 16 — Company+User+Membership). */
  create(input: CreateMembershipInput, tx?: Prisma.TransactionClient): Promise<Membership>;
  findActive(userId: string, companyId: string): Promise<Membership | null>;
  listByCompany(companyId: string): Promise<Membership[]>;
  updateStatus(id: string, status: MembershipStatus): Promise<Membership>;
}
