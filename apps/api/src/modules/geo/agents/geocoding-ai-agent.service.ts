import { Inject, Injectable } from "@nestjs/common";

import { GeoEngineService } from "../geo-engine.service";
import { SCHOOL_COORDINATE_REPOSITORY } from "../geo.constants";

import type { SchoolCoordinateRepository } from "../repositories/school-coordinate.repository";
import type { SchoolCoordinate } from "@prisma/client";

/**
 * Geocoding AI Agent (briefing "ROTTA GEO PLATFORM" §"AGENTES DE IA" —
 * agente 2/5). Responsabilidade única: endereço → Rotta Geo Engine →
 * latitude/longitude/precisão → salva no banco. NUNCA valida o
 * resultado (isso é do Validation AI Agent, agente 3/5, sempre chamado
 * em seguida por quem orquestra o fluxo).
 */
@Injectable()
export class GeocodingAiAgentService {
  constructor(
    private readonly geoEngine: GeoEngineService,
    @Inject(SCHOOL_COORDINATE_REPOSITORY)
    private readonly coordinateRepository: SchoolCoordinateRepository,
  ) {}

  async geocodeSchool(
    schoolId: string,
    endereco: string,
    tentativa = 1,
  ): Promise<SchoolCoordinate> {
    const resultado = await this.geoEngine.geocode(endereco);
    return this.coordinateRepository.create({
      schoolId,
      latitude: resultado.latitude,
      longitude: resultado.longitude,
      precisao: resultado.precisao,
      fonte: "NOMINATIM",
      tentativa,
    });
  }
}
