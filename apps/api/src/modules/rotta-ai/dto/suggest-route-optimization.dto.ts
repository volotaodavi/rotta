import { ApiProperty } from "@nestjs/swagger";
import { IsUUID } from "class-validator";

/**
 * Otimização de rota (ROT-08, V2 na própria Especificação Funcional —
 * Dossiê 3 §12.8). Só o identificador da rota: a sugestão em si (nova
 * sequência de paradas) seria resolvida, numa integração real, a partir
 * das paradas já persistidas (`RouteStop`) via um provedor de rotas
 * (Google Directions/OSRM).
 */
export class SuggestRouteOptimizationDto {
  @ApiProperty()
  @IsUUID()
  routeId!: string;
}
