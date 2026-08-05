import type { TripPositionResponseDto } from "../dto/trip-position-response.dto";
import type { TripPosition } from "@prisma/client";

export function toTripPositionResponseDto(position: TripPosition): TripPositionResponseDto {
  return {
    id: position.id,
    tripId: position.tripId,
    latitude: Number(position.latitude),
    longitude: Number(position.longitude),
    precisaoMetros: position.precisaoMetros ? Number(position.precisaoMetros) : null,
    velocidadeKmh: position.velocidadeKmh ? Number(position.velocidadeKmh) : null,
    capturadaEm: position.capturadaEm,
    simuladoSuspeito: position.simuladoSuspeito,
    createdAt: position.createdAt,
  };
}
