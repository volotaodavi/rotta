import type { SchoolAccessPointResponseDto } from "../dto/school-access-point-response.dto";
import type { SchoolAccessPoint } from "@prisma/client";

export function toSchoolAccessPointResponseDto(
  point: SchoolAccessPoint,
): SchoolAccessPointResponseDto {
  return {
    id: point.id,
    schoolId: point.schoolId,
    tipo: point.tipo,
    nome: point.nome,
    descricao: point.descricao,
    latitude: Number(point.latitude),
    longitude: Number(point.longitude),
    observacoes: point.observacoes,
    createdAt: point.createdAt,
    updatedAt: point.updatedAt,
  };
}
