import type { CompanyResponseDto } from "../dto/company-response.dto";
import type { CompanyWithPlan } from "../repositories/company.repository";

/** `Company` (Prisma, com `plan` incluído) → `CompanyResponseDto` — nunca vaza `planId` cru. */
export function toCompanyResponseDto(company: CompanyWithPlan): CompanyResponseDto {
  return {
    id: company.id,
    razaoSocial: company.razaoSocial,
    nomeFantasia: company.nomeFantasia,
    cpfCnpj: company.cpfCnpj,
    tipo: company.tipo,
    email: company.email,
    telefone: company.telefone,
    whatsapp: company.whatsapp,
    cep: company.cep,
    endereco: company.endereco,
    numero: company.numero,
    complemento: company.complemento,
    bairro: company.bairro,
    cidade: company.cidade,
    estado: company.estado,
    latitude: company.latitude ? Number(company.latitude) : null,
    longitude: company.longitude ? Number(company.longitude) : null,
    logoUrl: company.logoUrl,
    fotoUrl: company.fotoUrl,
    corPrimaria: company.corPrimaria,
    idioma: company.idioma,
    fusoHorario: company.fusoHorario,
    status: company.status,
    plan: {
      id: company.plan.id,
      code: company.plan.code,
      name: company.plan.name,
      priceCents: company.plan.priceCents,
    },
    createdAt: company.createdAt,
    updatedAt: company.updatedAt,
  };
}
