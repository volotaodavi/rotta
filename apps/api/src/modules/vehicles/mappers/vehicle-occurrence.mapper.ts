import type {
  ListVehicleOccurrencesResponseDto,
  VehicleOccurrenceResponseDto,
} from "../dto/vehicle-occurrence-response.dto";
import type { ListVehicleOccurrencesResult } from "../repositories/vehicle-occurrence.repository";
import type { VehicleOccurrence } from "@prisma/client";

export function toVehicleOccurrenceResponseDto(
  occurrence: VehicleOccurrence,
): VehicleOccurrenceResponseDto {
  return {
    id: occurrence.id,
    vehicleId: occurrence.vehicleId,
    reportadoPorId: occurrence.reportadoPorId,
    titulo: occurrence.titulo,
    descricao: occurrence.descricao,
    severidade: occurrence.severidade,
    fotoUrls: occurrence.fotoUrls,
    createdAt: occurrence.createdAt,
  };
}

export function toListVehicleOccurrencesResponseDto(
  result: ListVehicleOccurrencesResult,
  page: number,
  pageSize: number,
): ListVehicleOccurrencesResponseDto {
  return {
    items: result.items.map(toVehicleOccurrenceResponseDto),
    total: result.total,
    page,
    pageSize,
  };
}
