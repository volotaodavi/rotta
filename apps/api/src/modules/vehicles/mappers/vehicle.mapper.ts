import type { ListVehiclesResponseDto, VehicleResponseDto } from "../dto/vehicle-response.dto";
import type { ListVehiclesResult } from "../repositories/vehicle.repository";
import type { Vehicle } from "@prisma/client";

export function toVehicleResponseDto(vehicle: Vehicle): VehicleResponseDto {
  return {
    id: vehicle.id,
    companyId: vehicle.companyId,
    placa: vehicle.placa,
    modelo: vehicle.modelo,
    marca: vehicle.marca,
    ano: vehicle.ano,
    cor: vehicle.cor,
    renavam: vehicle.renavam,
    chassi: vehicle.chassi,
    capacidadePassageiros: vehicle.capacidadePassageiros,
    tipo: vehicle.tipo,
    categoria: vehicle.categoria,
    categoriaOrigem: vehicle.categoriaOrigem,
    categoriaRevisaoStatus: vehicle.categoriaRevisaoStatus,
    categoriaConfiancaIa: vehicle.categoriaConfiancaIa,
    categoriaMotivoIa: vehicle.categoriaMotivoIa,
    categoriaRevisadaPorId: vehicle.categoriaRevisadaPorId,
    categoriaRevisadaEm: vehicle.categoriaRevisadaEm,
    observacoes: vehicle.observacoes,
    fotoUrl: vehicle.fotoUrl,
    status: vehicle.status,
    revisaoAdminStatus: vehicle.revisaoAdminStatus,
    revisaoAdminObservacaoResponsaveis: vehicle.revisaoAdminObservacaoResponsaveis,
    revisaoAdminObservacaoTransportadora: vehicle.revisaoAdminObservacaoTransportadora,
    revisaoAdminDecididoPorId: vehicle.revisaoAdminDecididoPorId,
    revisaoAdminDecididoEm: vehicle.revisaoAdminDecididoEm,
    quilometragemAtual: vehicle.quilometragemAtual,
    ultimaLatitude: vehicle.ultimaLatitude ? Number(vehicle.ultimaLatitude) : null,
    ultimaLongitude: vehicle.ultimaLongitude ? Number(vehicle.ultimaLongitude) : null,
    ultimaPosicaoEm: vehicle.ultimaPosicaoEm,
    viagemAtualId: vehicle.viagemAtualId,
    ultimoMotoristaId: vehicle.ultimoMotoristaId,
    ultimoMonitorId: vehicle.ultimoMonitorId,
    createdAt: vehicle.createdAt,
    updatedAt: vehicle.updatedAt,
  };
}

export function toListVehiclesResponseDto(
  result: ListVehiclesResult,
  page: number,
  pageSize: number,
): ListVehiclesResponseDto {
  return {
    items: result.items.map(toVehicleResponseDto),
    total: result.total,
    page,
    pageSize,
  };
}
