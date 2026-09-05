import { Injectable } from "@nestjs/common";

import type {
  BoundingBox,
  SchoolMarker,
  SchoolMarkerComDistancia,
  SchoolMarkerRepository,
} from "./school-marker.repository";
import type { Coordenada } from "../geo-engine.types";

import { PrismaService } from "@/infra/database/prisma.service";

interface MarkerRow {
  id: string;
  nomeOficial: string;
  latitude: unknown;
  longitude: unknown;
  status: SchoolMarker["status"];
}

interface MarkerRowComDistancia extends MarkerRow {
  distanciaMetros: unknown;
}

function toMarker(row: MarkerRow): SchoolMarker {
  return {
    id: row.id,
    nomeOficial: row.nomeOficial,
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
    status: row.status,
  };
}

/**
 * Único lugar do sistema que lê `School.pontoGeografico` (campo
 * `Unsupported` no Prisma Client — não existe API do Prisma Client para
 * ele, só `$queryRaw`). Mesma disciplina de RLS de `PrismaSchoolRepository`:
 * `schools` não tem RLS (catálogo compartilhado), então nenhuma consulta
 * aqui usa `withTenant`/`withBypass`.
 *
 * Só considera Escolas `ATIVA` (mesmo critério de
 * `PrismaSchoolRepository.listAllActive`, já documentado como a fonte
 * do dashboard/mapa) — Escolas em análise/inativas/arquivadas não
 * aparecem como marcador no mapa geral.
 */
@Injectable()
export class PrismaSchoolMarkerRepository implements SchoolMarkerRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findInBoundingBox(bounds: BoundingBox, limit: number): Promise<SchoolMarker[]> {
    const rows = await this.prisma.$queryRaw<MarkerRow[]>`
      SELECT id, "nomeOficial", latitude, longitude, status
      FROM schools
      WHERE "deletedAt" IS NULL
        AND status = 'ATIVA'
        AND "pontoGeografico" && ST_MakeEnvelope(${bounds.swLng}, ${bounds.swLat}, ${bounds.neLng}, ${bounds.neLat}, 4326)::geography
      LIMIT ${limit}
    `;
    return rows.map(toMarker);
  }

  async findNearby(
    origem: Coordenada,
    raioKm: number,
    limit: number,
  ): Promise<SchoolMarkerComDistancia[]> {
    const raioMetros = raioKm * 1000;
    const rows = await this.prisma.$queryRaw<MarkerRowComDistancia[]>`
      SELECT id, "nomeOficial", latitude, longitude, status,
        ST_Distance("pontoGeografico", ST_SetSRID(ST_MakePoint(${origem.longitude}, ${origem.latitude}), 4326)::geography) AS "distanciaMetros"
      FROM schools
      WHERE "deletedAt" IS NULL
        AND status = 'ATIVA'
        AND ST_DWithin("pontoGeografico", ST_SetSRID(ST_MakePoint(${origem.longitude}, ${origem.latitude}), 4326)::geography, ${raioMetros})
      ORDER BY "distanciaMetros" ASC
      LIMIT ${limit}
    `;
    return rows.map((row) => ({ ...toMarker(row), distanciaMetros: Number(row.distanciaMetros) }));
  }
}
