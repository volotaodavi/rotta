import { Inject, Injectable } from "@nestjs/common";


import { SCHOOL_MARKER_REPOSITORY } from "../geo.constants";

import type { Coordenada } from "../geo-engine.types";
import type {
  BoundingBox,
  SchoolMarker,
  SchoolMarkerComDistancia,
  SchoolMarkerRepository,
} from "../repositories/school-marker.repository";

import { RedisService } from "@/infra/cache/redis.service";

/** Cap de marcadores por consulta — protege o mapa (e o Redis) de uma bounding box gigantesca numa base em escala nacional; o cliente deve reconsultar com zoom maior para ver mais detalhe. */
const MAX_MARKERS = 500;
/** TTL curto (Escolas mudam de coordenada raramente — o Education/Geocoding/Validation AI Agent, não o usuário navegando o mapa) só para absorver o "martelar" de múltiplos usuários olhando a mesma região ao mesmo tempo. */
const CACHE_TTL_SECONDS = 60;

/** Arredonda para ~100m de precisão — pans/zooms minúsculos do mapa continuam batendo na mesma chave de cache. */
function roundCoord(value: number): number {
  return Math.round(value * 1000) / 1000;
}

/**
 * Map Intelligence Agent (briefing "ROTTA GEO PLATFORM" §"AGENTES DE
 * IA" — agente 4/5): marcadores de Escola para o mapa, sobre o índice
 * espacial GiST de `School.pontoGeografico` (`SchoolMarkerRepository`),
 * com cache Redis (`RedisService`, já usado pelo resto do backend —
 * Dossiê 12 Seção 8) para absorver picadas de tráfego de usuários
 * olhando a mesma região do mapa ao mesmo tempo.
 */
@Injectable()
export class MapIntelligenceService {
  constructor(
    @Inject(SCHOOL_MARKER_REPOSITORY)
    private readonly markerRepository: SchoolMarkerRepository,
    private readonly redis: RedisService,
  ) {}

  listarMarcadores(bounds: BoundingBox): Promise<SchoolMarker[]> {
    const key = `geo:mapa:marcadores:${roundCoord(bounds.swLat)}:${roundCoord(bounds.swLng)}:${roundCoord(bounds.neLat)}:${roundCoord(bounds.neLng)}`;
    return this.redis.getOrSet(key, CACHE_TTL_SECONDS, () =>
      this.markerRepository.findInBoundingBox(bounds, MAX_MARKERS),
    );
  }

  listarProximas(origem: Coordenada, raioKm: number): Promise<SchoolMarkerComDistancia[]> {
    const key = `geo:mapa:proximas:${roundCoord(origem.latitude)}:${roundCoord(origem.longitude)}:${raioKm}`;
    return this.redis.getOrSet(key, CACHE_TTL_SECONDS, () =>
      this.markerRepository.findNearby(origem, raioKm, MAX_MARKERS),
    );
  }
}
