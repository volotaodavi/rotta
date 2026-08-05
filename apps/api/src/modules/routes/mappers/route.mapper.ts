import type { ListRoutesResponseDto, RouteResponseDto } from "../dto/route-response.dto";
import type { ListRoutesResult } from "../repositories/route.repository";
import type { Route } from "@prisma/client";

export function toRouteResponseDto(route: Route): RouteResponseDto {
  return {
    id: route.id,
    companyId: route.companyId,
    nome: route.nome,
    turno: route.turno,
    diasSemana: route.diasSemana,
    status: route.status,
    veiculoPadraoId: route.veiculoPadraoId,
    motoristaPadraoId: route.motoristaPadraoId,
    monitorPadraoId: route.monitorPadraoId,
    createdAt: route.createdAt,
    updatedAt: route.updatedAt,
  };
}

export function toListRoutesResponseDto(
  result: ListRoutesResult,
  page: number,
  pageSize: number,
): ListRoutesResponseDto {
  return {
    items: result.items.map(toRouteResponseDto),
    total: result.total,
    page,
    pageSize,
  };
}
