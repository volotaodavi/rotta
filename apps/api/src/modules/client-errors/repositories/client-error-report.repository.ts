import type { ClientApp, Prisma } from "@prisma/client";

/** `include` compartilhado — nome de quem estava logado/de qual empresa, sem exigir uma segunda consulta. */
export const CLIENT_ERROR_REPORT_INCLUDE = {
  user: { select: { nome: true } },
  company: { select: { nomeFantasia: true } },
} satisfies Prisma.ClientErrorReportInclude;

export type ClientErrorReportWithIncludes = Prisma.ClientErrorReportGetPayload<{
  include: typeof CLIENT_ERROR_REPORT_INCLUDE;
}>;

export interface CreateClientErrorReportData {
  app: ClientApp;
  message: string;
  digest?: string;
  stack?: string;
  path: string;
  userAgent?: string;
  buildId?: string;
  serviceWorkerActive?: boolean;
  source?: string;
  userId?: string;
  companyId?: string;
}

export interface ListClientErrorReportsFilter {
  app?: ClientApp;
  digest?: string;
  buildId?: string;
  page: number;
  pageSize: number;
}

export interface ListClientErrorReportsResult {
  items: ClientErrorReportWithIncludes[];
  total: number;
}

export const CLIENT_ERROR_REPORT_REPOSITORY = Symbol("CLIENT_ERROR_REPORT_REPOSITORY");

/**
 * Sem RLS/tenant scoping de propósito: `ClientErrorReport` é uma tabela
 * de diagnóstico pura (nunca controla acesso a nada), `companyId` é só
 * um filtro opcional pra correlacionar — quem lê (`GET /client-errors`)
 * é sempre Admin Rotta, cross-tenant, garantido pelo `@Roles` do
 * controller, mesmo padrão de outras leituras administrativas puras.
 */
export interface ClientErrorReportRepository {
  create(data: CreateClientErrorReportData): Promise<ClientErrorReportWithIncludes>;
  list(filter: ListClientErrorReportsFilter): Promise<ListClientErrorReportsResult>;
}
