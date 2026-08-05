import type { Trip, TripStatus, Vehicle } from "@prisma/client";

export interface CreateTripData {
  companyId: string;
  routeId: string;
  data: Date;
  veiculoId: string;
  motoristaId: string;
  monitorId?: string;
}

export interface UpdateTripData {
  status?: TripStatus;
  finalizadaEm?: Date | null;
  canceladaEm?: Date | null;
}

/** Linha enriquecida para o mapa/localizador (GPS-01/03/06) — junta o veículo (posição) e nomes de motorista/rota. */
export interface ActiveTripWithDetails extends Trip {
  veiculo: Vehicle;
  route: { id: string; nome: string; turno: string };
  motorista: { id: string; nome: string };
  monitor: { id: string; nome: string } | null;
}

/**
 * `trips` tem RLS por `companyId` (mesmo mecanismo de `vehicles`/`routes`).
 * `@@unique([routeId, data])` no schema garante no máximo UMA viagem por
 * rota por dia — ver nota de limitação conhecida em `TripsService.start`.
 */
export interface TripRepository {
  create(data: CreateTripData): Promise<Trip>;
  findById(id: string): Promise<Trip | null>;
  findByRouteAndDate(routeId: string, data: Date): Promise<Trip | null>;
  update(id: string, data: UpdateTripData): Promise<Trip>;
  /** Todas as viagens EM_ANDAMENTO do tenant, com dados do veículo/rota/motorista/monitor — usado pelo mapa. */
  listActiveByCompany(companyId: string): Promise<ActiveTripWithDetails[]>;
  /** A viagem EM_ANDAMENTO de hoje para uma rota específica, já enriquecida — usado pelo localizador do Responsável. */
  findActiveDetailedByRouteId(routeId: string, data: Date): Promise<ActiveTripWithDetails | null>;
  /** Histórico de viagens de uma rota (mais recentes primeiro) — GPS-07/histórico. */
  listByRoute(
    routeId: string,
    page: number,
    pageSize: number,
  ): Promise<{ items: Trip[]; total: number }>;
}
