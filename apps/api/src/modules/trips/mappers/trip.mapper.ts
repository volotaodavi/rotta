import type { ListTripsResponseDto, TripResponseDto } from "../dto/trip-response.dto";
import type { Trip } from "@prisma/client";

export function toTripResponseDto(trip: Trip): TripResponseDto {
  return {
    id: trip.id,
    companyId: trip.companyId,
    routeId: trip.routeId,
    data: trip.data,
    status: trip.status,
    veiculoId: trip.veiculoId,
    motoristaId: trip.motoristaId,
    monitorId: trip.monitorId,
    iniciadaEm: trip.iniciadaEm,
    finalizadaEm: trip.finalizadaEm,
    canceladaEm: trip.canceladaEm,
    createdAt: trip.createdAt,
    updatedAt: trip.updatedAt,
  };
}

export function toListTripsResponseDto(
  result: { items: Trip[]; total: number },
  page: number,
  pageSize: number,
): ListTripsResponseDto {
  return {
    items: result.items.map(toTripResponseDto),
    total: result.total,
    page,
    pageSize,
  };
}
