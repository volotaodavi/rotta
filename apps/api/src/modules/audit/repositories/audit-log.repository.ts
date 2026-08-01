import type { AuditLog } from "@prisma/client";

/**
 * `AuditLog` = `RegistroAuditoria` do Dossie 8, Secao 16 — registro
 * imutavel (so INSERT/SELECT, nunca UPDATE/DELETE via aplicacao).
 * Polimorfico (`entidadeTipo`/`entidadeId`) para ser reutilizavel por
 * qualquer modulo futuro sem precisar de uma tabela por dominio
 * (Dossie 8, Secao 16.3).
 */
export interface RecordAuditLogInput {
  companyId: string;
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

export interface ListAuditLogsResult {
  items: AuditLog[];
  total: number;
}

export interface AuditLogRepository {
  record(input: RecordAuditLogInput): Promise<AuditLog>;
  list(filter: ListAuditLogsFilter): Promise<ListAuditLogsResult>;
}
