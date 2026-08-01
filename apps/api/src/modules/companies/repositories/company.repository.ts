import type { Company, CompanyStatus, CompanyType, Plan, Prisma } from "@prisma/client";

export type CompanyWithPlan = Company & { plan: Plan };

export interface CreateCompanyData {
  razaoSocial: string;
  nomeFantasia: string;
  cpfCnpj: string;
  tipo: CompanyType;
  email: string;
  telefone: string;
  whatsapp?: string;
  cep: string;
  endereco: string;
  numero: string;
  complemento?: string;
  bairro: string;
  cidade: string;
  estado: string;
  latitude?: number;
  longitude?: number;
  corPrimaria?: string;
  idioma?: string;
  fusoHorario?: string;
  planId: string;
}

export interface UpdateCompanyData {
  razaoSocial?: string;
  nomeFantasia?: string;
  email?: string;
  telefone?: string;
  whatsapp?: string;
  cep?: string;
  endereco?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
  latitude?: number;
  longitude?: number;
  logoUrl?: string;
  fotoUrl?: string;
  corPrimaria?: string;
  idioma?: string;
  fusoHorario?: string;
  status?: CompanyStatus;
  planId?: string;
  deletedAt?: Date | null;
}

export interface ListCompaniesFilter {
  search?: string;
  status?: CompanyStatus;
  tipo?: CompanyType;
  page: number;
  pageSize: number;
  sortBy: "createdAt" | "nomeFantasia" | "status";
  sortOrder: "asc" | "desc";
  /** Admin Rotta enxerga excluídas ao filtrar explicitamente; nunca por padrão. */
  includeDeleted?: boolean;
}

export interface ListCompaniesResult {
  items: CompanyWithPlan[];
  total: number;
}

/**
 * `companies` É o tenant (Dossiê 8, Seção 1) — tem RLS pela própria
 * `id`. Toda implementação passa por `PrismaService.withTenant(...)`,
 * exceto `create` quando chamada com `tx` (dentro de
 * `PrismaService.runInTenantTransaction`, ver Dossiê 16 —
 * `CompaniesService.create`, que precisa de Company+User+Membership
 * atômicos).
 */
export interface CompanyRepository {
  create(data: CreateCompanyData, tx?: Prisma.TransactionClient): Promise<CompanyWithPlan>;
  findById(id: string): Promise<CompanyWithPlan | null>;
  findByCpfCnpj(cpfCnpj: string): Promise<Company | null>;
  update(id: string, data: UpdateCompanyData): Promise<CompanyWithPlan>;
  list(filter: ListCompaniesFilter): Promise<ListCompaniesResult>;
}
