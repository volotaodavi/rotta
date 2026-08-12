import { ApiProperty } from "@nestjs/swagger";
import { IsUUID } from "class-validator";

/**
 * Otimização de rota (ROT-08, Dossiê 18). Só o identificador da rota —
 * a sugestão em si (`RouteOptimizationResponseDto`) é resolvida a
 * partir das paradas já persistidas (`RouteStop`), via
 * `GeoEngineService.optimizeTrip` (OSRM `/trip`).
 */
export class SuggestRouteOptimizationDto {
  @ApiProperty()
  @IsUUID()
  routeId!: string;
}
