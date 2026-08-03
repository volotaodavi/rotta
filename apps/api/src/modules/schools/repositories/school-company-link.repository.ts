import type { SchoolCompanyLink } from "@prisma/client";

export interface CreateSchoolCompanyLinkData {
  schoolId: string;
  companyId: string;
  vinculadoPorId: string;
}

/**
 * `school_company_links` tem RLS por `companyId` (dado de tenant de
 * verdade, ao contrário de `School`) — toda operação passa por
 * `PrismaService.withTenant(...)`, exceto `findActiveForSchool` (usado
 * pelo dashboard/RBAC cross-tenant do Admin Rotta e para decidir se
 * uma Escola já está "em uso" por alguém antes de arquivá-la), que
 * usa `withBypass` deliberadamente.
 */
export interface SchoolCompanyLinkRepository {
  create(data: CreateSchoolCompanyLinkData): Promise<SchoolCompanyLink>;
  findActiveByCompanyAndSchool(
    companyId: string,
    schoolId: string,
  ): Promise<SchoolCompanyLink | null>;
  encerra(id: string, encerradoPorId: string): Promise<SchoolCompanyLink>;
  listActiveByCompany(companyId: string): Promise<SchoolCompanyLink[]>;
  /** Bypass — todas as empresas (de qualquer tenant) atualmente vinculadas a uma escola. */
  findActiveForSchool(schoolId: string): Promise<SchoolCompanyLink[]>;
}
