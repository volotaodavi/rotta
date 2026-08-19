import type { TransportRequestResponseDto } from "../dto/transport-request-response.dto";
import type { TransportRequestWithRelations } from "../repositories/transport-request.repository";
import type { TransportRequest } from "@prisma/client";

/**
 * Aceita tanto o registro cru (`create`/`updateStatus`, sem join) quanto
 * o registro com relações carregadas (`findByIdScoped`/`findById`/`list`
 * — ver nota em `TransportRequestResponseDto`). Os campos `*Nome` saem
 * `undefined` no primeiro caso, nunca inventados.
 */
export function toTransportRequestResponseDto(
  transportRequest: TransportRequest | TransportRequestWithRelations,
): TransportRequestResponseDto {
  const withRelations = transportRequest as Partial<TransportRequestWithRelations>;
  return {
    id: transportRequest.id,
    studentId: transportRequest.studentId,
    studentNome: withRelations.student?.nome,
    responsavelId: transportRequest.responsavelId,
    responsavelNome: withRelations.responsavel?.nome,
    responsavelTelefone: withRelations.responsavel?.telefone,
    companyId: transportRequest.companyId,
    companyNome: withRelations.company?.nomeFantasia,
    schoolId: transportRequest.schoolId,
    schoolNome: withRelations.school?.nomeOficial,
    turno: transportRequest.turno,
    status: transportRequest.status,
    motivoRecusa: transportRequest.motivoRecusa,
    createdAt: transportRequest.createdAt,
    updatedAt: transportRequest.updatedAt,
  };
}
