import type { StudentAuthorizedPersonResponseDto } from "../dto/student-authorized-person-response.dto";
import type { StudentAuthorizedPerson } from "@prisma/client";

export function toStudentAuthorizedPersonResponseDto(
  person: StudentAuthorizedPerson,
): StudentAuthorizedPersonResponseDto {
  return {
    id: person.id,
    studentId: person.studentId,
    nome: person.nome,
    cpf: person.cpf,
    telefone: person.telefone,
    parentesco: person.parentesco,
    createdAt: person.createdAt,
  };
}
