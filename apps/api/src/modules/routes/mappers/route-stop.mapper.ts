import type { RouteStopResponseDto } from "../dto/route-stop-response.dto";
import type { RouteStop } from "@prisma/client";

export function toRouteStopResponseDto(stop: RouteStop): RouteStopResponseDto {
  return {
    id: stop.id,
    routeId: stop.routeId,
    ordem: stop.ordem,
    endereco: stop.endereco,
    latitude: Number(stop.latitude),
    longitude: Number(stop.longitude),
    horarioPrevisto: stop.horarioPrevisto,
    schoolId: stop.schoolId,
    createdAt: stop.createdAt,
    updatedAt: stop.updatedAt,
  };
}
