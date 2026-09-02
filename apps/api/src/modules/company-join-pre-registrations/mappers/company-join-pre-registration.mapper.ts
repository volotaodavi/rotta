import type { CompanyJoinPreRegistrationResponseDto } from "../dto/company-join-pre-registration-response.dto";
import type { CompanyJoinPreRegistration } from "@prisma/client";

export function toCompanyJoinPreRegistrationResponseDto(
  entry: CompanyJoinPreRegistration,
): CompanyJoinPreRegistrationResponseDto {
  return {
    id: entry.id,
    role: entry.role,
    nome: entry.nome,
    celular: entry.celular,
    status: entry.status,
    vinculadoEm: entry.vinculadoEm,
    createdAt: entry.createdAt,
  };
}
