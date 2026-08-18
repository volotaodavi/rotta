import type { RouteStop } from "@prisma/client";

export interface CreateRouteStopData {
  routeId: string;
  companyId: string;
  ordem: number;
  endereco: string;
  latitude: number;
  longitude: number;
  horarioPrevisto: string;
  /** Escola do catálogo compartilhado quando a parada é NA escola — ver `CreateRouteStopDto`. */
  schoolId?: string | null;
}

export interface UpdateRouteStopData {
  ordem?: number;
  endereco?: string;
  latitude?: number;
  longitude?: number;
  horarioPrevisto?: string;
  schoolId?: string | null;
}

/**
 * `route_stops` tem RLS por `companyId` (o campo é desnormalizado aqui
 * — mesmo raciocínio de `VehicleDocument.companyId` — para não exigir
 * um join com `Route` em toda query com RLS).
 */
export interface RouteStopRepository {
  create(data: CreateRouteStopData): Promise<RouteStop>;
  createMany(data: CreateRouteStopData[]): Promise<RouteStop[]>;
  findById(id: string): Promise<RouteStop | null>;
  update(id: string, data: UpdateRouteStopData): Promise<RouteStop>;
  listByRoute(routeId: string): Promise<RouteStop[]>;
  /** Usado por `RoutesService.removeStop` — nunca soft-delete (paradas não têm histórico próprio; ver nota do schema). */
  delete(id: string): Promise<void>;
  /** Reordenação em lote — usado ao inserir/remover uma parada no meio da sequência. */
  reorder(routeId: string, ordered: { id: string; ordem: number }[]): Promise<void>;
}
