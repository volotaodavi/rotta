import { Injectable } from "@nestjs/common";


import type {
  AuditLogRepository,
  ListAuditLogsByEntityFilter,
  ListAuditLogsFilter,
  ListAuditLogsResult,
  RecordAuditLogInput,
} from "./audit-log.repository";
import type { AuditLog, Prisma } from "@prisma/client";

import { PrismaService } from "@/infra/database/prisma.service";

/**
 * `audit_logs` tem RLS por `companyId` (Dossie 8, Secao 16) — toda
 * operacao passa por `this.prisma.withTenant(...)` (ver nota critica em
 * `prisma.service.ts`).
 */
@Injectable()
export class PrismaAuditLogRepository implements AuditLogRepository {
  constructor(private readonly prisma: PrismaService) {}

  record(input: RecordAuditLogInput): Promise<AuditLog> {
    const operation = this.prisma.auditLog.create({
      data: {
        companyId: input.companyId,
        entidadeTipo: input.entidadeTipo,
        entidadeId: input.entidadeId,
        acao: input.acao,
        atorUserId: input.atorUserId,
        dadosAntes: input.dadosAntes as Prisma.InputJsonValue | undefined,
        dadosDepois: input.dadosDepois as Prisma.InputJsonValue | undefined,
        ip: input.ip,
        userAgent: input.userAgent,
      },
    });

    // Sem `companyId` (ex. ator Responsável — módulo Marketplace, ou
    // Admin Rotta agindo sobre um catálogo compartilhado): não há
    // tenant nenhum para o `WITH CHECK` da policy comparar, então
    // `withTenant` (que lê o contexto AMBIENTE da requisição, quase
    // sempre `bypass: false` para papéis sem tenant — ver
    // `TenantGuard`) rejeitaria a escrita mesmo sendo legítima.
    // `withBypass` aqui é seguro: é sempre um INSERT de uma linha nova,
    // nunca uma leitura cross-tenant.
    return input.companyId ? this.prisma.withTenant(operation) : this.prisma.withBypass(operation);
  }

  async list(filter: ListAuditLogsFilter): Promise<ListAuditLogsResult> {
    const where: Prisma.AuditLogWhereInput = {
      companyId: filter.companyId,
      ...(filter.entidadeTipo ? { entidadeTipo: filter.entidadeTipo } : {}),
      ...(filter.entidadeId ? { entidadeId: filter.entidadeId } : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.withTenant(
        this.prisma.auditLog.findMany({
          where,
          orderBy: { createdAt: "desc" },
          skip: (filter.page - 1) * filter.pageSize,
          take: filter.pageSize,
        }),
      ),
      this.prisma.withTenant(this.prisma.auditLog.count({ where })),
    ]);

    return { items, total };
  }

  async listByEntity(filter: ListAuditLogsByEntityFilter): Promise<ListAuditLogsResult> {
    const where: Prisma.AuditLogWhereInput = {
      entidadeTipo: filter.entidadeTipo,
      entidadeId: filter.entidadeId,
    };

    const [items, total] = await Promise.all([
      this.prisma.withBypass(
        this.prisma.auditLog.findMany({
          where,
          orderBy: { createdAt: "desc" },
          skip: (filter.page - 1) * filter.pageSize,
          take: filter.pageSize,
        }),
      ),
      this.prisma.withBypass(this.prisma.auditLog.count({ where })),
    ]);

    return { items, total };
  }
}
