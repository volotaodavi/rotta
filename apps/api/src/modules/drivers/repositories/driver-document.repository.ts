import type { DriverDocument, DriverDocumentAiStatus, DriverDocumentType } from "@prisma/client";

export interface CreateDriverDocumentData {
  userId: string;
  companyId: string;
  tipo: DriverDocumentType;
  numero?: string;
  categoria?: string;
  nomeOriginal: string;
  mimeType: string;
  fileUrl: string;
  vencimentoEm?: Date;
  uploadedByUserId: string;
}

export interface UpdateDriverDocumentAiResultData {
  rottaAiStatus: DriverDocumentAiStatus;
  rottaAiQualidadeOk?: boolean;
  rottaAiLegivel?: boolean;
  rottaAiSuspeitaAdulteracao?: boolean;
  rottaAiObservacoes?: string;
  rottaAiAnalisadoEm: Date;
}

export interface ListDriverDocumentsFilter {
  userId: string;
  tipo?: DriverDocumentType;
}

/**
 * `driver_documents` tem RLS por `companyId` — mesmo mecanismo de
 * `vehicle_documents` (ver `vehicle-document.repository.ts`), aplicado
 * via `PrismaService.withTenant` em toda operação da implementação
 * Prisma.
 */
export interface DriverDocumentRepository {
  create(data: CreateDriverDocumentData): Promise<DriverDocument>;
  findById(id: string): Promise<DriverDocument | null>;
  updateAiResult(id: string, data: UpdateDriverDocumentAiResultData): Promise<DriverDocument>;
  listByUser(filter: ListDriverDocumentsFilter): Promise<DriverDocument[]>;
  /** Documentos com vencimento nos próximos `withinDays` dias — alimenta `NotificationType.CNH_VENCENDO`/`EventoAgendaTipo.VENCIMENTO_CNH`. */
  listExpiringSoon(companyId: string, withinDays: number): Promise<DriverDocument[]>;
  softDelete(id: string): Promise<DriverDocument>;
}
