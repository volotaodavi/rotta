import type { StudentAddressOverrideResponseDto } from "../dto/student-address-override-response.dto";
import type { StudentAddressOverride } from "@prisma/client";

export function toStudentAddressOverrideResponseDto(
  override: StudentAddressOverride,
): StudentAddressOverrideResponseDto {
  return {
    id: override.id,
    studentId: override.studentId,
    data: override.data.toISOString().slice(0, 10),
    trecho: override.trecho,
    cep: override.cep,
    logradouro: override.logradouro,
    numero: override.numero,
    complemento: override.complemento,
    bairro: override.bairro,
    cidade: override.cidade,
    estado: override.estado,
    latitude: Number(override.latitude),
    longitude: Number(override.longitude),
    observacao: override.observacao,
    createdAt: override.createdAt,
    updatedAt: override.updatedAt,
  };
}
