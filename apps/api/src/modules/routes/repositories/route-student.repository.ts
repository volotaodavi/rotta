import type { RouteStudent } from "@prisma/client";

export interface CreateRouteStudentData {
  routeId: string;
  companyId: string;
  contractId: string;
  studentId: string;
  paradaEmbarqueId: string;
  paradaDesembarqueId: string;
}

export interface UpdateRouteStudentData {
  paradaEmbarqueId?: string;
  paradaDesembarqueId?: string;
  ativo?: boolean;
}

/**
 * `route_students` tem RLS por `companyId`. `contractId` é `@unique` no
 * schema — um contrato só pode estar vinculado a UMA rota por vez
 * (trocar de rota exige encerrar o vínculo atual antes, nunca dois
 * vínculos simultâneos para o mesmo contrato).
 */
export interface RouteStudentRepository {
  create(data: CreateRouteStudentData): Promise<RouteStudent>;
  findById(id: string): Promise<RouteStudent | null>;
  findByContractId(contractId: string): Promise<RouteStudent | null>;
  update(id: string, data: UpdateRouteStudentData): Promise<RouteStudent>;
  listByRoute(routeId: string): Promise<RouteStudent[]>;
  /**
   * RN-26 ("um aluno não pode estar em duas rotas ativas do mesmo
   * turno") precisa ver TODAS as rotas do aluno, de qualquer tenant —
   * chamada sempre via `PrismaService.withBypass` no repositório, nunca
   * `withTenant` (um aluno pode, em teoria — embora incomum —, ter
   * contratos com empresas diferentes).
   */
  listActiveByStudentAcrossTenants(
    studentId: string,
  ): Promise<(RouteStudent & { route: { turno: string; companyId: string } })[]>;
  delete(id: string): Promise<void>;
}
