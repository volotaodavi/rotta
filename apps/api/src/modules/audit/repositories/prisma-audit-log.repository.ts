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
    return this.prisma.withTenant(
      this.prisma.auditLog.create({
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
      }),
    );
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
