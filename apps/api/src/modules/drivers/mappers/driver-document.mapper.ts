import type { DriverDocumentResponseDto } from "../dto/driver-document-response.dto";
import type { DriverDocument } from "@prisma/client";

/**
 * `freshFileUrl` (Dossiê 45, achado C3): quando o chamador já assinou
 * uma URL nova de curta validade a partir de `document.filePath`
 * (`DriversService.resolvePrivateFileUrl`), ela substitui
 * `document.fileUrl` aqui — nunca serve a URL de validade longa
 * persistida quando existe um `filePath` para reassinar.
 */
export function toDriverDocumentResponseDto(
  document: DriverDocument,
  freshFileUrl?: string,
): DriverDocumentResponseDto {
  return {
    id: document.id,
    userId: document.userId,
    companyId: document.companyId,
    tipo: document.tipo,
    numero: document.numero,
    categoria: document.categoria,
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
