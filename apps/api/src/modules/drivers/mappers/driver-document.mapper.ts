import type { DriverDocumentResponseDto } from "../dto/driver-document-response.dto";
import type { DriverDocument } from "@prisma/client";

export function toDriverDocumentResponseDto(document: DriverDocument): DriverDocumentResponseDto {
  return {
    id: document.id,
    userId: document.userId,
    companyId: document.companyId,
    tipo: document.tipo,
    numero: document.numero,
    categoria: document.categoria,
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
