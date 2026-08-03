import type {
  Prisma,
  School,
  SchoolAdministrativeDependency,
  SchoolShift,
  SchoolStatus,
  SchoolType,
} from "@prisma/client";

export interface CreateSchoolData {
  codigoInterno: string;
  codigoInep?: string;
  nomeOficial: string;
  nomeFantasia?: string;
  redeEnsino?: string;
  dependenciaAdministrativa: SchoolAdministrativeDependency;
  cnpj?: string;
  telefone?: string;
  whatsapp?: string;
  email?: string;
  website?: string;
  cep: string;
  logradouro: string;
  numero: string;
  complemento?: string;
  bairro: string;
  cidade: string;
  estado: string;
  pais?: string;
  latitude?: number;
  longitude?: number;
  observacoesLocalizacao?: string;
  tipos: SchoolType[];
  turnosAtendidos: SchoolShift[];
  status?: SchoolStatus;
  origemCadastro?: string;
  criadoPorId?: string;
}

export type UpdateSchoolData = Partial<Omit<CreateSchoolData, "codigoInterno">> & {
  deletedAt?: Date | null;
};

export interface ListSchoolsFilter {
  search?: string;
  cidade?: string;
  estado?: string;
  redeEnsino?: string;
  tipo?: SchoolType;
  turno?: SchoolShift;
  status?: SchoolStatus;
  /** Só aplicado quando o service resolve escopar por uma Empresa (via `SchoolCompanyLink` vigente). */
  companyId?: string;
  page: number;
  pageSize: number;
  sortBy: "createdAt" | "nomeOficial" | "cidade";
  sortOrder: "asc" | "desc";
  includeDeleted?: boolean;
}

export interface ListSchoolsResult {
  items: School[];
  total: number;
}

/**
 * `schools` NÃO tem RLS (catálogo compartilhado — ver nota de
 * arquitetura no model `School`, `schema.prisma`) — nenhum método aqui
 * usa `withTenant`/`withBypass` para isolar por tenant; o escopo por
 * Empresa (quando existe) vem do JOIN com `SchoolCompanyLink` via
 * `companyId` no filtro de `list`.
 */
export interface SchoolRepository {
  create(data: CreateSchoolData, tx?: Prisma.TransactionClient): Promise<School>;
  findById(id: string): Promise<School | null>;
  findByCodigoInep(codigoInep: string): Promise<School | null>;
  /** Busca em lote por `codigoInep` (Education Sync Agent — evita N consultas ao diferenciar um lote do Censo Escolar contra a base atual). */
  findManyByCodigosInep(codigosInep: string[]): Promise<School[]>;
  update(id: string, data: UpdateSchoolData): Promise<School>;
  list(filter: ListSchoolsFilter): Promise<ListSchoolsResult>;
  /** Todas as escolas ativas (para dashboard/mapa) — opcionalmente escopadas a uma Empresa via vínculo vigente. */
  listAllActive(companyId?: string): Promise<School[]>;
  nextCodigoInternoSequence(): Promise<number>;
}
