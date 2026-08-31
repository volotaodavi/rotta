import type { StudentAddressOverrideRecurrenceResponseDto } from "../dto/student-address-override-recurrence-response.dto";
import type { StudentAddressOverrideRecurrence } from "@prisma/client";

export function toStudentAddressOverrideRecurrenceResponseDto(
  regra: StudentAddressOverrideRecurrence,
): StudentAddressOverrideRecurrenceResponseDto {
  return {
    id: regra.id,
    studentId: regra.studentId,
    diasSemana: regra.diasSemana,
    vigenciaInicio: regra.vigenciaInicio.toISOString().slice(0, 10),
    vigenciaFim: regra.vigenciaFim ? regra.vigenciaFim.toISOString().slice(0, 10) : null,
    trecho: regra.trecho,
    cep: regra.cep,
    logradouro: regra.logradouro,
    numero: regra.numero,
    complemento: regra.complemento,
    bairro: regra.bairro,
    cidade: regra.cidade,
    estado: regra.estado,
    latitude: Number(regra.latitude),
    longitude: Number(regra.longitude),
    observacao: regra.observacao,
    createdAt: regra.createdAt,
    updatedAt: regra.updatedAt,
  };
}
