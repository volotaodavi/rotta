import type { Trip, TripStatus, Vehicle } from "@prisma/client";

export interface CreateTripData {
  companyId: string;
  routeId: string;
  data: Date;
  veiculoId: string;
  motoristaId: string;
  monitorId?: string;
  /** Código único legível da viagem (pedido do usuário: "código da viagem - único") — gerado por `TripsService.createTripWithUniqueCode`, nunca pelo repositório. */
  codigo: string;
}

export interface UpdateTripData {
  status?: TripStatus;
  pausadaEm?: Date | null;
  finalizadaEm?: Date | null;
  canceladaEm?: Date | null;
  /** Geofencing (Prompt "Rotta Geo Platform" §25) — dedup do aviso de aproximação, ver nota no schema. */
  ultimaParadaProximaNotificadaId?: string | null;
  /** Substituição pontual do dia (`ROT-05`/`ROT-06`, tarefa #102) — nunca sobrescreve `Route.motoristaPadraoId`/`veiculoPadraoId`/`monitorPadraoId`. */
  veiculoId?: string;
  motoristaId?: string;
  monitorId?: string | null;
}

/** Linha enriquecida para o mapa/localizador (GPS-01/03/06) — junta o veículo (posição) e nomes de motorista/rota. */
export interface ActiveTripWithDetails extends Trip {
  veiculo: Vehicle;
  route: { id: string; nome: string; turno: string };
  motorista: { id: string; nome: string };
  monitor: { id: string; nome: string } | null;
  /** Só populado por `listActiveNationwide` — o mapa por tenant já sabe de qual empresa é (é a própria empresa logada). */
  company?: { id: string; nomeFantasia: string };
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
  /**
   * Todas as viagens EM_ANDAMENTO de TODAS as empresas — "Mapa Nacional
   * de Veículos" do Admin Rotta (mesmo escopo cross-tenant do "Mapa
   * Nacional de Escolas", `GeoController`/`MapIntelligenceService`).
   * Nunca chamado para Empresa/Gestor (só `listActiveForMap` decide
   * isso, com base em `actor.role`).
   */
  listActiveNationwide(): Promise<ActiveTripWithDetails[]>;
  /** A viagem EM_ANDAMENTO de hoje para uma rota específica, já enriquecida — usado pelo localizador do Responsável. */
  findActiveDetailedByRouteId(routeId: string, data: Date): Promise<ActiveTripWithDetails | null>;
  /** Histórico de viagens de uma rota (mais recentes primeiro) — GPS-07/histórico. */
  listByRoute(
    routeId: string,
    page: number,
    pageSize: number,
  ): Promise<{ items: Trip[]; total: number }>;
}
