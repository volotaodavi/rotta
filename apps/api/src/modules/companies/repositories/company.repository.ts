import type { Company, CompanyStatus, CompanyType, Plan, Prisma } from "@prisma/client";

export type CompanyWithPlan = Company & { plan: Plan };

export interface CreateCompanyData {
  /** Gerado por `CompaniesService.generateCodigoInterno()` antes de chamar `create` — mesmo padrão de `School.codigoInterno`. */
  codigoInterno: string;
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
  /** ID da assinatura ativa na AbacatePay (`subs_...`) — ver nota no schema Prisma. */
  abacatepaySubscriptionId?: string | null;
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
  /** Consumida via `nextval(...)` em `CompaniesService.generateCodigoInterno()` — mesmo padrão de `SchoolRepository.nextCodigoInternoSequence`. */
  nextCodigoInternoSequence(): Promise<number>;
  /**
   * Frente N — resolve `Company.codigoInterno` para
   * `CompanyJoinRequestsService.create` e `StudentPreRegistrationsService.lookup`.
   * Bypass de RLS (mesmo motivo de `TransporterRepository.findCandidateByCodigoInterno`
   * — quem chama ainda não tem tenant).
   *
   * ACHADO REAL (pedido do usuário: código+celular corretos batendo
   * "não foi possível encontrar"): copiava literalmente o filtro
   * `status: "ATIVO"` do Marketplace (`TransporterRepository.
   * findCandidateByCodigoInterno`), mas os dois usos daqui são bem
   * diferentes de "aparecer pra um Responsável desconhecido buscar
   * transportadora nova" — são um motorista/monitor ou Responsável que
   * JÁ tem uma relação com a empresa (o código veio da própria
   * transportadora, por WhatsApp/papel) tentando se vincular a algo que
   * ela mesma já criou. `Company.status` só vira `ATIVO` depois da
   * assinatura paga confirmada (`BillingService`, webhook AbacatePay) —
   * toda empresa nova começa em `TRIAL` (`@default(TRIAL)`) e É
   * exatamente durante o trial que a transportadora mais precisa
   * cadastrar motoristas/alunos pra provar valor antes de pagar. Corrigido
   * pra bloquear só os status que realmente significam "não deveria
   * operar" (`SUSPENSO`: bloqueio manual do Admin Rotta; `CANCELADO`:
   * não é mais cliente) — `TRIAL`/`INADIMPLENTE` continuam encontráveis,
   * ao contrário do Marketplace (que decide deliberadamente só recomendar
   * transportadoras pagantes pra Responsável NOVO descobrir).
   */
  findActiveByCodigoInterno(codigoInterno: string): Promise<Company | null>;
}
