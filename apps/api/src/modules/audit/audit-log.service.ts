import { Inject, Injectable } from "@nestjs/common";

import { AUDIT_LOG_REPOSITORY } from "./audit.constants";

import type {
  AuditLogRepository,
  ListAuditLogsResult,
  RecordAuditLogInput,
} from "./repositories/audit-log.repository";
import type { AuditLog } from "@prisma/client";

/**
 * Modulo Audit (Dossie 13, Secao 20): "expõe apenas leitura" — a
 * escrita (`record`) e chamada internamente por outros modulos
 * (Companies, e futuramente Drivers/Vehicles/Routes/...), nunca por uma
 * rota HTTP dedicada. RN-32 (Dossie 8): toda alteracao em entidade
 * sensivel e obrigatoriamente auditada — nao e uma opcao de
 * implementacao dos services chamadores.
 */
@Injectable()
export class AuditLogService {
  constructor(@Inject(AUDIT_LOG_REPOSITORY) private readonly repository: AuditLogRepository) {}

  record(input: RecordAuditLogInput): Promise<AuditLog> {
    return this.repository.record(input);
  }

  listByCompany(
    companyId: string,
    filter: { entidadeTipo?: string; entidadeId?: string; page?: number; pageSize?: number },
  ): Promise<ListAuditLogsResult> {
    return this.repository.list({
      companyId,
      entidadeTipo: filter.entidadeTipo,
      entidadeId: filter.entidadeId,
      page: filter.page ?? 1,
      pageSize: filter.pageSize ?? 20,
    });
  }
}
