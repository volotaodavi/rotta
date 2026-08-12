import type { MapVehicleResponseDto } from "../dto/map-vehicle-response.dto";
import type { ActiveTripWithDetails } from "../repositories/trip.repository";

export function toMapVehicleResponseDto(trip: ActiveTripWithDetails): MapVehicleResponseDto {
  return {
    tripId: trip.id,
    routeId: trip.route.id,
    routeNome: trip.route.nome,
    turno: trip.route.turno,
    veiculoId: trip.veiculo.id,
    placa: trip.veiculo.placa,
    latitude: trip.veiculo.ultimaLatitude ? Number(trip.veiculo.ultimaLatitude) : null,
    longitude: trip.veiculo.ultimaLongitude ? Number(trip.veiculo.ultimaLongitude) : null,
    ultimaPosicaoEm: trip.veiculo.ultimaPosicaoEm,
    motoristaNome: trip.motorista.nome,
    monitorNome: trip.monitor?.nome ?? null,
    iniciadaEm: trip.iniciadaEm,
    companyId: trip.company?.id,
    companyNome: trip.company?.nomeFantasia,
  };
}
