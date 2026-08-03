import type { ListSchoolsResponseDto, SchoolResponseDto } from "../dto/school-response.dto";
import type { ListSchoolsResult } from "../repositories/school.repository";
import type { School } from "@prisma/client";

export function toSchoolResponseDto(school: School): SchoolResponseDto {
  return {
    id: school.id,
    codigoInterno: school.codigoInterno,
    codigoInep: school.codigoInep,
    nomeOficial: school.nomeOficial,
    nomeFantasia: school.nomeFantasia,
    redeEnsino: school.redeEnsino,
    dependenciaAdministrativa: school.dependenciaAdministrativa,
    cnpj: school.cnpj,
    telefone: school.telefone,
    whatsapp: school.whatsapp,
    email: school.email,
    website: school.website,
    cep: school.cep,
    logradouro: school.logradouro,
    numero: school.numero,
    complemento: school.complemento,
    bairro: school.bairro,
    cidade: school.cidade,
    estado: school.estado,
    pais: school.pais,
    latitude: school.latitude ? Number(school.latitude) : null,
    longitude: school.longitude ? Number(school.longitude) : null,
    observacoesLocalizacao: school.observacoesLocalizacao,
    tipos: school.tipos,
    turnosAtendidos: school.turnosAtendidos,
    status: school.status,
    origemCadastro: school.origemCadastro,
    criadoPorId: school.criadoPorId,
    createdAt: school.createdAt,
    updatedAt: school.updatedAt,
  };
}

export function toListSchoolsResponseDto(
  result: ListSchoolsResult,
  page: number,
  pageSize: number,
): ListSchoolsResponseDto {
  return {
    items: result.items.map(toSchoolResponseDto),
    total: result.total,
    page,
    pageSize,
  };
}
