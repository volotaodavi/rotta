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
  /**
   * Bypass — os ids das escolas que a empresa atende hoje, para o
   * credenciamento em massa saber o que já existe antes de criar.
   *
   * Não dá para reusar `listActiveByCompany` aqui: aquele usa
   * `withTenant`, e quem chama é o Admin da Rotta agindo SOBRE a
   * transportadora, de um tenant que não é o dela — a RLS devolveria
   * lista vazia e o credenciamento duplicaria tudo. O `companyId` no
   * `where` é o que mantém o bypass restrito.
   *
   * Devolve só os ids porque é o que o chamador cruza, e porque a
   * alternativa (`IN (...)` com milhares de UUIDs do município) seria
   * bem mais cara que trazer a lista da empresa inteira, que é limitada
   * pelo tamanho dela.
   */
  listActiveSchoolIdsByCompany(companyId: string): Promise<string[]>;
  /**
   * Bypass — cria vários vínculos de uma vez (mesmo motivo acima).
   *
   * Em lotes, porque o Postgres aceita 65535 parâmetros por statement e
   * cada vínculo gasta 3 colunas: um município grande estouraria o
   * limite num `createMany` só. O tamanho do lote é decisão da
   * implementação, não de quem chama.
   */
  createManyEmLotes(data: CreateSchoolCompanyLinkData[]): Promise<void>;
}
