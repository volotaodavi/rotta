import type { TransportRequestResponseDto } from "../dto/transport-request-response.dto";
import type { TransportRequest } from "@prisma/client";

export function toTransportRequestResponseDto(
  transportRequest: TransportRequest,
): TransportRequestResponseDto {
  return {
    id: transportRequest.id,
    studentId: transportRequest.studentId,
    responsavelId: transportRequest.responsavelId,
    companyId: transportRequest.companyId,
    schoolId: transportRequest.schoolId,
    turno: transportRequest.turno,
    status: transportRequest.status,
    motivoRecusa: transportRequest.motivoRecusa,
    createdAt: transportRequest.createdAt,
    updatedAt: transportRequest.updatedAt,
  };
}
