import type { SchoolAdministrativeDependency } from "@prisma/client";

/** A área com o nome da escola já resolvido, para a resposta da API não precisar de uma segunda consulta. */
export interface CompanyServiceAreaWithSchool {
  id: string;
  companyId: string;
  cidade: string | null;
  estado: string | null;
  schoolId: string | null;
  dependencias: SchoolAdministrativeDependency[];
  createdAt: Date;
  school: { nomeOficial: string; nomeFantasia: string | null } | null;
}

/** O bastante para decidir se uma escola cabe na cerca — sem carregar o nome da escola vinculada. */
export interface CompanyServiceAreaCerca {
  cidade: string | null;
  estado: string | null;
  schoolId: string | null;
  dependencias: SchoolAdministrativeDependency[];
}

export interface CreateCompanyServiceAreaData {
  companyId: string;
  cidade: string | null;
  /** Já em maiúsculas — quem chama normaliza, para a sigla nunca depender de como foi digitada. */
  estado: string | null;
  schoolId: string | null;
  dependencias: SchoolAdministrativeDependency[];
  criadoPorId: string;
}

/**
 * `company_service_areas` é escrita e lida pelo Admin da Rotta agindo
 * SOBRE uma transportadora — quem executa está num tenant diferente do
 * dono da linha (ou em nenhum, no caso do guard chamado por
 * `SchoolsService.linkCompany`). Por isso toda operação aqui usa
 * `PrismaService.withBypass(...)`, e não `withTenant`: sob o tenant do
 * Admin a RLS por `companyId` não devolveria linha nenhuma.
 *
 * O bypass não alarga nada porque TODO método recebe o `companyId` e o
 * põe no `where` — inclusive o `delete`, que é `deleteMany` com os dois
 * ids justamente para que um id de área de outra empresa não apague
 * nada em vez de apagar a linha errada.
 */
export interface CompanyServiceAreaRepository {
  create(data: CreateCompanyServiceAreaData): Promise<CompanyServiceAreaWithSchool>;
  /** Com o nome da escola — é o que a tela mostra. Ordenado por criação, a ordem em que o Admin montou a cerca. */
  listByCompany(companyId: string): Promise<CompanyServiceAreaWithSchool[]>;
  /** Sem o nome da escola — alimenta o guard de credenciamento, que só precisa comparar. */
  listCercasByCompany(companyId: string): Promise<CompanyServiceAreaCerca[]>;
  /** As áreas de município de uma UF, para não duplicar a área ao recredenciar o mesmo município. */
  listCidadesByCompanyAndEstado(companyId: string, estado: string): Promise<(string | null)[]>;
  /** `deleteMany` com `companyId` no `where` — ver a nota acima. */
  deleteByIdAndCompany(areaId: string, companyId: string): Promise<void>;
}
