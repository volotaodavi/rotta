import type { VehicleDocumentResponseDto } from "../dto/vehicle-document-response.dto";
import type { VehicleDocument } from "@prisma/client";

export function toVehicleDocumentResponseDto(
  document: VehicleDocument,
): VehicleDocumentResponseDto {
  return {
    id: document.id,
    vehicleId: document.vehicleId,
    maintenanceId: document.maintenanceId,
    tipo: document.tipo,
    nomeOriginal: document.nomeOriginal,
    mimeType: document.mimeType,
    fileUrl: document.fileUrl,
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
