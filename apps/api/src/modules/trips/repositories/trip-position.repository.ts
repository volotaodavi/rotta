import type { TripPosition } from "@prisma/client";

export interface CreateTripPositionData {
  tripId: string;
  companyId: string;
  latitude: number;
  longitude: number;
  precisaoMetros?: number;
  velocidadeKmh?: number;
  capturadaEm: Date;
  simuladoSuspeito?: boolean;
}

/**
 * `trip_positions` tem RLS por `companyId`. Nunca atualizado/deletado —
 * só `create`/`createMany` (histórico bruto imutável, ver nota do
 * schema) e leituras ordenadas por `capturadaEm`.
 */
export interface TripPositionRepository {
  create(data: CreateTripPositionData): Promise<TripPosition>;
  createMany(data: CreateTripPositionData[]): Promise<TripPosition[]>;
  listByTrip(tripId: string): Promise<TripPosition[]>;
  findLatestByTrip(tripId: string): Promise<TripPosition | null>;
}
