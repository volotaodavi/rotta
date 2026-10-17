import type {
  ChecklistViagemDto,
  ListVehicleChecklistsResponseDto,
  VehicleChecklistResponseDto,
} from "../dto/vehicle-checklist-response.dto";
import type {
  ListVehicleChecklistsResult,
  VehicleChecklistComContexto,
} from "../repositories/vehicle-checklist.repository";

export function toChecklistViagemDto(
  trip: NonNullable<VehicleChecklistComContexto["trip"]>,
): ChecklistViagemDto {
  return {
    id: trip.id,
    codigo: trip.codigo,
    data: trip.data,
    sentido: trip.sentido,
    status: trip.status,
    iniciadaEm: trip.iniciadaEm,
    finalizadaEm: trip.finalizadaEm,
  };
}

export function toVehicleChecklistResponseDto(
  checklist: VehicleChecklistComContexto,
): VehicleChecklistResponseDto {
  return {
    id: checklist.id,
    vehicleId: checklist.vehicleId,
    preenchidoPorId: checklist.preenchidoPorId,
    preenchidoPorNome: checklist.preenchidoPor.nome,
    viagem: checklist.trip ? toChecklistViagemDto(checklist.trip) : null,
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
