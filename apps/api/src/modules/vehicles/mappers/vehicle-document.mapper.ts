import type { VehicleDocumentResponseDto } from "../dto/vehicle-document-response.dto";
import type { VehicleDocument } from "@prisma/client";

/** `freshFileUrl` — ver nota equivalente em `toDriverDocumentResponseDto` (Dossiê 45, achado C3). */
export function toVehicleDocumentResponseDto(
  document: VehicleDocument,
  freshFileUrl?: string,
): VehicleDocumentResponseDto {
  return {
    id: document.id,
    vehicleId: document.vehicleId,
    maintenanceId: document.maintenanceId,
    tipo: document.tipo,
    nomeOriginal: document.nomeOriginal,
    mimeType: document.mimeType,
    fileUrl: freshFileUrl ?? document.fileUrl,
    vencimentoEm: document.vencimentoEm,
    rottaAiStatus: document.rottaAiStatus,
    rottaAiQualidadeOk: document.rottaAiQualidadeOk,
    rottaAiLegivel: document.rottaAiLegivel,
    rottaAiSuspeitaAdulteracao: document.rottaAiSuspeitaAdulteracao,
    rottaAiObservacoes: document.rottaAiObservacoes,
    rottaAiAnalisadoEm: document.rottaAiAnalisadoEm,
    uploadedByUserId: document.uploadedByUserId,
    createdAt: document.createdAt,
  };
}
