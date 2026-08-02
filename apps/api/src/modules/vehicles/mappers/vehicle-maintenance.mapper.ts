import type {
  ListVehicleMaintenancesResponseDto,
  VehicleMaintenanceResponseDto,
} from "../dto/vehicle-maintenance-response.dto";
import type { ListVehicleMaintenancesResult } from "../repositories/vehicle-maintenance.repository";
import type { VehicleMaintenance } from "@prisma/client";

export function toVehicleMaintenanceResponseDto(
  maintenance: VehicleMaintenance,
): VehicleMaintenanceResponseDto {
  return {
    id: maintenance.id,
    vehicleId: maintenance.vehicleId,
    tipo: maintenance.tipo,
    data: maintenance.data,
    quilometragem: maintenance.quilometragem,
    valorCentavos: maintenance.valorCentavos,
    fornecedor: maintenance.fornecedor,
    observacoes: maintenance.observacoes,
    registradoPorId: maintenance.registradoPorId,
    createdAt: maintenance.createdAt,
  };
}

export function toListVehicleMaintenancesResponseDto(
  result: ListVehicleMaintenancesResult,
  page: number,
  pageSize: number,
): ListVehicleMaintenancesResponseDto {
  return {
    items: result.items.map(toVehicleMaintenanceResponseDto),
    total: result.total,
    page,
    pageSize,
  };
}
