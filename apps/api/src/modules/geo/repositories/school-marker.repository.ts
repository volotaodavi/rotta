import type { Coordenada } from "../geo-engine.types";
import type { SchoolStatus } from "@prisma/client";

export interface BoundingBox {
  swLat: number;
  swLng: number;
  neLat: number;
  neLng: number;
}

export interface SchoolMarker {
  id: string;
  nomeOficial: string;
  latitude: number;
  longitude: number;
  status: SchoolStatus;
}

export interface SchoolMarkerComDistancia extends SchoolMarker {
  distanciaMetros: number;
}

/**
 * Leitura de marcadores de Escola para o mapa (Map Intelligence Agent,
 * briefing "ROTTA GEO PLATFORM" §"AGENTES DE IA" — agente 4/5). Único
 * lugar do sistema que faz `$queryRaw` contra `School.pontoGeografico`
 * (índice espacial GiST, campo `Unsupported` no Prisma Client — nenhum
 * outro repository/service lê essa coluna).
 */
export interface SchoolMarkerRepository {
  /** Escolas cujo ponto cai dentro da janela visível do mapa (bounding box) — usa o índice GiST via `&&`. */
  findInBoundingBox(bounds: BoundingBox, limit: number): Promise<SchoolMarker[]>;
  /** Escolas dentro de um raio (km) de um ponto, ordenadas pela mais próxima — usa o índice GiST via `ST_DWithin`. */
  findNearby(
    origem: Coordenada,
    raioKm: number,
    limit: number,
  ): Promise<SchoolMarkerComDistancia[]>;
}
