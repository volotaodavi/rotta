import type { Prisma } from "@prisma/client";

/** `include` compartilhado — nome de quem publicou, sem exigir uma segunda consulta. */
export const PLAN_NOTICE_INCLUDE = {
  criadoPor: { select: { id: true, nome: true } },
  company: { select: { id: true, nomeFantasia: true } },
} satisfies Prisma.PlanNoticeInclude;

export type PlanNoticeWithRelations = Prisma.PlanNoticeGetPayload<{
  include: typeof PLAN_NOTICE_INCLUDE;
}>;

export interface CreatePlanNoticeData {
  titulo: string;
  corpo: string;
  /** `undefined`/`null` = aviso GLOBAL (toda empresa enxerga). */
  companyId?: string | null;
  criadoPorUserId: string;
}

export interface ListPlanNoticesFilter {
  page: number;
  pageSize: number;
  /** Admin filtrando por uma empresa específica — nunca aplicado na leitura tenant-scoped (essa já é escopada pelo RLS). */
  companyId?: string;
}

export interface ListPlanNoticesResult {
  items: PlanNoticeWithRelations[];
  total: number;
}

/**
 * `plan_notices` (Dossiê 26, "Controle de Planos") — tabela de tenant
 * opcional: `companyId = null` é global (RLS libera pra qualquer
 * tenant), `companyId` setado é isolado por tenant (mesma policy
 * `tenant_isolation` das demais tabelas, ver migração
 * `20260827160000_plan_notice`). Escrita (`create`/`setAtivo`) sempre
 * roda em bypass (só Admin Rotta cria/edita); leitura da própria
 * empresa (`listActiveForCompany`) roda tenant-scoped.
 */
export interface PlanNoticeRepository {
  create(data: CreatePlanNoticeData): Promise<PlanNoticeWithRelations>;
  /** Admin Rotta — todas as empresas, com ou sem filtro por `companyId`. */
  list(filter: ListPlanNoticesFilter): Promise<ListPlanNoticesResult>;
  setAtivo(id: string, ativo: boolean): Promise<PlanNoticeWithRelations>;
  /** Empresa/Gestor — só os avisos ativos globais + os da própria empresa (tenant-scoped, ver `withTenant`). */
  listActiveForCompany(companyId: string): Promise<PlanNoticeWithRelations[]>;
}
