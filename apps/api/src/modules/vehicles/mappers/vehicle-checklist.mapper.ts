import type {
  ListVehicleChecklistsResponseDto,
  VehicleChecklistResponseDto,
} from "../dto/vehicle-checklist-response.dto";
import type { ListVehicleChecklistsResult } from "../repositories/vehicle-checklist.repository";
import type { VehicleChecklist } from "@prisma/client";

export function toVehicleChecklistResponseDto(
  checklist: VehicleChecklist,
): VehicleChecklistResponseDto {
  return {
    id: checklist.id,
    vehicleId: checklist.vehicleId,
    motoristaId: checklist.motoristaId,
    viagemId: checklist.viagemId,
    pneusOk: checklist.pneusOk,
    lucesOk: checklist.lucesOk,
    combustivelOk: checklist.combustivelOk,
    limpezaOk: checklist.limpezaOk,
    equipamentosObrigatoriosOk: checklist.equipamentosObrigatoriosOk,
    observacoes: checklist.observacoes,
    createdAt: checklist.createdAt,
  };
}

export function toListVehicleChecklistsResponseDto(
  result: ListVehicleChecklistsResult,
  page: number,
  pageSize: number,
): ListVehicleChecklistsResponseDto {
  return {
    items: result.items.map(toVehicleChecklistResponseDto),
    total: result.total,
    page,
    pageSize,
  };
}
