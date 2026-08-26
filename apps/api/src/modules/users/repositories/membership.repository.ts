import type { Company, Membership, MembershipStatus, Prisma } from "@prisma/client";

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

export type MembershipWithCompany = Membership & { company: Company };

export interface MembershipRepository {
  /** `tx` opcional: usado quando a criação precisa ser atômica com outras escritas (ex. Dossiê 16 — Company+User+Membership). */
  create(input: CreateMembershipInput, tx?: Prisma.TransactionClient): Promise<Membership>;
  findActive(userId: string, companyId: string): Promise<Membership | null>;
  listByCompany(companyId: string): Promise<Membership[]>;
  updateStatus(id: string, status: MembershipStatus): Promise<Membership>;
  /**
   * Lista os próprios vínculos ativos do usuário através de QUALQUER
   * tenant (Dossiê 15, `AUTH-02` — seletor de perfil no login). Chamado
   * apenas via `PrismaService.withBypass` (Dossiê 8, Seção 15.2: bypass
   * legítimo, nunca uma consulta cross-tenant de terceiros).
   */
  listActiveByUserWithCompany(userId: string): Promise<MembershipWithCompany[]>;
  /**
   * IDs distintos de `User` com vínculo ativo em QUALQUER tenant, para
   * algum dos papéis informados — usado pelo fan-out cross-tenant de um
   * `Announcement` (públicos `EMPRESAS`/`MOTORISTAS_MONITORES`). Mesma
   * justificativa de bypass que `listActiveByUserWithCompany`.
   */
  listActiveUserIdsByRoles(roles: string[]): Promise<string[]>;
}
