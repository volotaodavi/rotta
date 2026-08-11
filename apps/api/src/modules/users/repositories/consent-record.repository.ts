import type { ConsentRecord, ConsentType } from "@prisma/client";

/**
 * Repository Pattern (Dossie 12 Secao 6.1) — consentimento versionado
 * (Dossiê 45 FRENTE 5, ver `schema.prisma` model `ConsentRecord`). Cada
 * aceite grava uma nova linha (insert-only, mesmo espírito de
 * `AuditLog`); `listByUser` retorna o histórico completo ordenado do
 * mais recente para o mais antigo — quem chama decide como resumir
 * (ex. `UsersService.getPendingConsents` pega só o primeiro de cada
 * `tipo`).
 */
export interface RecordConsentEntry {
  tipo: ConsentType;
  versao: string;
}

export interface ConsentRecordRepository {
  recordAcceptance(userId: string, entries: RecordConsentEntry[]): Promise<void>;
  listByUser(userId: string): Promise<ConsentRecord[]>;
}
