import type {
  ClaimStudentPreRegistrationResponseDto,
  StudentPreRegistrationLookupResponseDto,
  StudentPreRegistrationResponseDto,
} from "../dto/student-pre-registration-response.dto";
import type { StudentPreRegistrationWithCompany } from "../repositories/student-pre-registration.repository";
import type { StudentPreRegistration } from "@prisma/client";

export function toStudentPreRegistrationResponseDto(
  entity: StudentPreRegistration,
): StudentPreRegistrationResponseDto {
  return {
    id: entity.id,
    companyId: entity.companyId,
    nomeAluno: entity.nomeAluno,
    nomeResponsavel: entity.nomeResponsavel,
    celularResponsavel: entity.celularResponsavel,
    status: entity.status,
    createdAt: entity.createdAt,
  };
}

export function toStudentPreRegistrationLookupResponseDto(
  entity: StudentPreRegistrationWithCompany,
): StudentPreRegistrationLookupResponseDto {
  return {
    id: entity.id,
    companyName: entity.company.nomeFantasia,
    nomeAluno: entity.nomeAluno,
    nomeResponsavel: entity.nomeResponsavel,
  };
}

export function toClaimStudentPreRegistrationResponseDto(
  entity: StudentPreRegistrationWithCompany,
): ClaimStudentPreRegistrationResponseDto {
  return {
    ...toStudentPreRegistrationLookupResponseDto(entity),
    companyId: entity.companyId,
  };
}
