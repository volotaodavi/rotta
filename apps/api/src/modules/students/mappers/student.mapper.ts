import type { StudentResponseDto } from "../dto/student-response.dto";
import type { Student } from "@prisma/client";

/** `freshFotoUrl` — ver nota equivalente em `toDriverDocumentResponseDto` (Dossiê 45, achado C3); foto de aluno é o caso mais sensível dos três (LGPD art. 14). */
export function toStudentResponseDto(
  student: Student,
  freshFotoUrl?: string | null,
): StudentResponseDto {
  return {
    id: student.id,
    responsavelId: student.responsavelId,
    nome: student.nome,
    fotoUrl: freshFotoUrl !== undefined ? freshFotoUrl : student.fotoUrl,
    dataNascimento: student.dataNascimento,
    sexo: student.sexo,
    schoolId: student.schoolId,
    turno: student.turno,
    embarqueCep: student.embarqueCep,
    embarqueLogradouro: student.embarqueLogradouro,
    embarqueNumero: student.embarqueNumero,
    embarqueComplemento: student.embarqueComplemento,
    embarqueBairro: student.embarqueBairro,
    embarqueCidade: student.embarqueCidade,
    embarqueEstado: student.embarqueEstado,
    embarqueLatitude: student.embarqueLatitude ? Number(student.embarqueLatitude) : null,
    embarqueLongitude: student.embarqueLongitude ? Number(student.embarqueLongitude) : null,
    desembarqueCep: student.desembarqueCep,
    desembarqueLogradouro: student.desembarqueLogradouro,
    desembarqueNumero: student.desembarqueNumero,
    desembarqueComplemento: student.desembarqueComplemento,
    desembarqueBairro: student.desembarqueBairro,
    desembarqueCidade: student.desembarqueCidade,
    desembarqueEstado: student.desembarqueEstado,
    desembarqueLatitude: student.desembarqueLatitude ? Number(student.desembarqueLatitude) : null,
    desembarqueLongitude: student.desembarqueLongitude
      ? Number(student.desembarqueLongitude)
      : null,
    necessidadesEspeciais: student.necessidadesEspeciais,
    medicamentos: student.medicamentos,
    observacoes: student.observacoes,
    createdAt: student.createdAt,
    updatedAt: student.updatedAt,
  };
}
