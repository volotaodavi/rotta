import { Module } from "@nestjs/common";

import { AuditLogService } from "./audit-log.service";
import { AUDIT_LOG_REPOSITORY } from "./audit.constants";
import { PrismaAuditLogRepository } from "./repositories/prisma-audit-log.repository";

/**
 * Modulo Audit (Dossie 13, Secao 20) — exposicao de leitura do log de
 * auditoria imutavel (Dossie 8, Secao 16). Nunca aceita escrita/edicao
 * via API — o registro e gerado internamente por outros modulos
 * (`AuditLogService.record`, injetado via DI).
 *
 * ESTADO ATUAL: expoe `AuditLogService` para os modulos de dominio; o
 * controller de leitura fica dentro de cada modulo de dominio (ex.
 * `CompaniesController` expoe `GET /companies/:id/audit-logs`) em vez de
 * um `/audit-logs?entidadeTipo=` generico — decisão deliberada: cada
 * domínio já resolve a própria autorização (um Gestor pode ver o
 * histórico da sua Empresa, mas não teria como listar auditoria de
 * qualquer entidade por um endpoint genérico sem duplicar essa checagem
 * aqui).
 */
@Module({
  providers: [
    AuditLogService,
    { provide: AUDIT_LOG_REPOSITORY, useClass: PrismaAuditLogRepository },
  ],
  exports: [AuditLogService],
})
export class AuditModule {}
