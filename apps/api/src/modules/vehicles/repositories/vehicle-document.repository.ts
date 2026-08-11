import type { VehicleDocument, VehicleDocumentAiStatus, VehicleDocumentType } from "@prisma/client";

export interface CreateVehicleDocumentData {
  vehicleId: string;
  companyId: string;
  maintenanceId?: string;
  tipo: VehicleDocumentType;
  nomeOriginal: string;
  mimeType: string;
  fileUrl: string;
  /// Ver `VehicleDocument.filePath`, `schema.prisma` (Dossiê 45, achado C3).
  filePath?: string;
  vencimentoEm?: Date;
  uploadedByUserId: string;
}

export interface UpdateVehicleDocumentAiResultData {
  rottaAiStatus: VehicleDocumentAiStatus;
  rottaAiQualidadeOk?: boolean;
  rottaAiLegivel?: boolean;
  rottaAiSuspeitaAdulteracao?: boolean;
  rottaAiObservacoes?: string;
  rottaAiAnalisadoEm: Date;
}

export interface ListVehicleDocumentsFilter {
  vehicleId: string;
  tipo?: VehicleDocumentType;
}

/** `vehicle_documents` tem RLS por `companyId` — ver nota em `vehicle.repository.ts`. */
export interface VehicleDocumentRepository {
  create(data: CreateVehicleDocumentData): Promise<VehicleDocument>;
  findById(id: string): Promise<VehicleDocument | null>;
  updateAiResult(id: string, data: UpdateVehicleDocumentAiResultData): Promise<VehicleDocument>;
  listByVehicle(filter: ListVehicleDocumentsFilter): Promise<VehicleDocument[]>;
  /** Documentos com vencimento nos próximos `withinDays` dias, para lembretes/dashboard/alertas. */
  listExpiringSoon(companyId: string, withinDays: number): Promise<VehicleDocument[]>;
  softDelete(id: string): Promise<VehicleDocument>;
}
