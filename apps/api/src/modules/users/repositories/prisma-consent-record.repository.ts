import { Injectable } from "@nestjs/common";

import type { ConsentRecordRepository, RecordConsentEntry } from "./consent-record.repository";
import type { ConsentRecord } from "@prisma/client";

import { PrismaService } from "@/infra/database/prisma.service";

/** Implementação Prisma do `ConsentRecordRepository`. `consent_records` é tabela global (sem RLS por tenant), mesma justificativa de `PrismaUserRepository`. */
@Injectable()
export class PrismaConsentRecordRepository implements ConsentRecordRepository {
  constructor(private readonly prisma: PrismaService) {}

  async recordAcceptance(userId: string, entries: RecordConsentEntry[]): Promise<void> {
    if (entries.length === 0) return;
    await this.prisma.consentRecord.createMany({
      data: entries.map((entry) => ({ userId, tipo: entry.tipo, versao: entry.versao })),
    });
  }

  listByUser(userId: string): Promise<ConsentRecord[]> {
    return this.prisma.consentRecord.findMany({
      where: { userId },
      orderBy: { aceitoEm: "desc" },
    });
  }
}
