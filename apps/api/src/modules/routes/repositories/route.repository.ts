import type { Route, RouteStatus, RouteWeekday, SchoolShift } from "@prisma/client";

export interface CreateRouteData {
  companyId: string;
  nome: string;
  turno: SchoolShift;
  diasSemana: RouteWeekday[];
  veiculoPadraoId?: string | null;
  motoristaPadraoId?: string | null;
  monitorPadraoId?: string | null;
}

export interface UpdateRouteData {
  nome?: string;
  turno?: SchoolShift;
  diasSemana?: RouteWeekday[];
  status?: RouteStatus;
  veiculoPadraoId?: string | null;
  motoristaPadraoId?: string | null;
  monitorPadraoId?: string | null;
  deletedAt?: Date | null;
}

export interface ListRoutesFilter {
  search?: string;
  status?: RouteStatus;
  turno?: SchoolShift;
  /** Só relevante para Admin Rotta (bypass de RLS) — mesma convenção de `ListVehiclesFilter.companyId`. */
  companyId?: string;
  /**
   * Prompt Mestre da Rotta, Seções 5/9 ("o app do Motorista não deve
   * virar um painel administrativo"/"o Monitor deve visualizar apenas o
   * necessário") — quando presente, restringe a listagem às rotas onde
   * este usuário é `motoristaPadraoId` OU `monitorPadraoId`. Setado por
   * `RoutesService.list` sempre que o ator autenticado tem role
   * MOTORISTA/MONITOR, nunca escolhido pelo próprio cliente.
   */
  atribuidaAUserId?: string;
  page: number;
  pageSize: number;
}

export interface ListRoutesResult {
  items: Route[];
  total: number;
}

/**
 * `routes` tem RLS por `companyId` (mesmo mecanismo de `vehicles`). Toda
 * operação passa por `PrismaService.withTenant(...)`, exceto onde
 * explicitamente anotado.
 */
export interface RouteRepository {
  create(data: CreateRouteData): Promise<Route>;
  findById(id: string): Promise<Route | null>;
  update(id: string, data: UpdateRouteData): Promise<Route>;
  list(filter: ListRoutesFilter): Promise<ListRoutesResult>;
  /** Todas as rotas ativas do tenant, sem paginação — usado pelo mapa/dashboard. */
  listAllActive(companyId: string): Promise<Route[]>;
}
