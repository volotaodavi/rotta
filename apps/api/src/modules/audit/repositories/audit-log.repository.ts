import type { AuditLog } from "@prisma/client";

/**
 * `AuditLog` = `RegistroAuditoria` do Dossie 8, Secao 16 — registro
 * imutavel (so INSERT/SELECT, nunca UPDATE/DELETE via aplicacao).
 * Polimorfico (`entidadeTipo`/`entidadeId`) para ser reutilizavel por
 * qualquer modulo futuro sem precisar de uma tabela por dominio
 * (Dossie 8, Secao 16.3).
 */
export interface RecordAuditLogInput {
  /**
   * Tenant do ATOR que executou a ação — opcional desde o módulo
   * Escolas: `Role.ADMIN_ROTTA` não tem tenant (`tenantId: null`), e
   * `School`/`SchoolAccessPoint` são catálogo compartilhado sem
   * `companyId` próprio (ver nota em `School` no schema.prisma).
   * Omitir aqui só é seguro quando o ator tem `bypass: true` (Admin
   * Rotta) — `PrismaAuditLogRepository.record` grava via
   * `withTenant`, que usa o contexto de tenant já resolvido pelo
   * `TenantGuard` da requisição corrente.
   */
  companyId?: string;
  entidadeTipo: string;
  entidadeId: string;
  acao: string;
  atorUserId?: string;
  dadosAntes?: Record<string, unknown>;
  dadosDepois?: Record<string, unknown>;
  ip?: string;
  userAgent?: string;
}

export interface ListAuditLogsFilter {
  companyId: string;
  entidadeTipo?: string;
  entidadeId?: string;
  page: number;
  pageSize: number;
}

/**
 * Trilha de auditoria de uma entidade de CATÁLOGO COMPARTILHADO (ex.
 * `School`), atravessando tenants — nunca usado para entidades de
 * tenant único (`Vehicle`, `Company`), que continuam em
 * `ListAuditLogsFilter` (RLS por `companyId`). Implementado com
 * `withBypass`, mesma justificativa de `VehicleRepository.findByPlaca`:
 * "quem alterou uma escola compartilhada" não é dado sensível de
 * nenhum tenant específico.
 */
export interface ListAuditLogsByEntityFilter {
  entidadeTipo: string;
  entidadeId: string;
  page: number;
  pageSize: number;
}

export interface ListAuditLogsResult {
  items: AuditLog[];
  total: number;
}

export interface AuditLogRepository {
  record(input: RecordAuditLogInput): Promise<AuditLog>;
  list(filter: ListAuditLogsFilter): Promise<ListAuditLogsResult>;
  listByEntity(filter: ListAuditLogsByEntityFilter): Promise<ListAuditLogsResult>;
}
