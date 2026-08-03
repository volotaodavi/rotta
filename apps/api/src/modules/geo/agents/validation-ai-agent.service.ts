import { Inject, Injectable } from "@nestjs/common";


import { GeoEngineService } from "../geo-engine.service";
import { SCHOOL_COORDINATE_REPOSITORY } from "../geo.constants";

import { GeocodingAiAgentService } from "./geocoding-ai-agent.service";

import type { SchoolCoordinateRepository } from "../repositories/school-coordinate.repository";
import type { SchoolRepository } from "@/modules/schools/repositories/school.repository";
import type { School, SchoolCoordinate } from "@prisma/client";

import { normalize } from "@/modules/schools/school-duplicate.util";
import { SCHOOL_REPOSITORY } from "@/modules/schools/schools.constants";

const MAX_TENTATIVAS = 3;
const RELEVANCIA_MINIMA = 0.5;

export type ValidationOutcome =
  | { status: "VALIDADO"; coordinate: SchoolCoordinate }
  | { status: "REPROCESSANDO"; anterior: SchoolCoordinate; proxima: SchoolCoordinate }
  | { status: "REVISAO_MANUAL"; coordinate: SchoolCoordinate };

/**
 * Validation AI Agent (briefing "ROTTA GEO PLATFORM" §"AGENTES DE IA" —
 * agente 3/5). Confere de forma independente o resultado do Geocoding
 * AI Agent: geocodifica a coordenada de volta (reverse geocode, nunca
 * confiando no texto que o próprio forward geocode devolveu) e compara
 * cidade/estado com o cadastro da Escola, além de exigir uma relevância
 * mínima do provedor. Aprovado → `VALIDADO` (copiado para
 * `School.latitude`/`longitude`); reprovado → `REPROCESSAR` e uma nova
 * tentativa via Geocoding AI Agent, até 3 no total — a 4ª reprovação cai
 * na Fila de Revisão Manual (`REVISAO_MANUAL`), nunca um loop infinito.
 */
@Injectable()
export class ValidationAiAgentService {
  constructor(
    private readonly geoEngine: GeoEngineService,
    private readonly geocodingAgent: GeocodingAiAgentService,
    @Inject(SCHOOL_COORDINATE_REPOSITORY)
    private readonly coordinateRepository: SchoolCoordinateRepository,
    @Inject(SCHOOL_REPOSITORY)
    private readonly schoolRepository: SchoolRepository,
  ) {}

  async validate(coordinate: SchoolCoordinate, school: School): Promise<ValidationOutcome> {
    const aprovado = await this.isConsistente(coordinate, school);

    if (aprovado) {
      const validado = await this.coordinateRepository.updateStatus(coordinate.id, "VALIDADO", {
        validadoPorIa: true,
      });
      await this.schoolRepository.update(school.id, {
        latitude: Number(coordinate.latitude),
        longitude: Number(coordinate.longitude),
      });
      return { status: "VALIDADO", coordinate: validado };
    }

    if (coordinate.tentativa >= MAX_TENTATIVAS) {
      const revisao = await this.coordinateRepository.updateStatus(
        coordinate.id,
        "REVISAO_MANUAL",
        {
          validadoPorIa: false,
          motivoRevisao: `${MAX_TENTATIVAS} tentativas automáticas reprovadas — cidade/estado/precisão não conferem com o cadastro da escola.`,
        },
      );
      return { status: "REVISAO_MANUAL", coordinate: revisao };
    }

    const anterior = await this.coordinateRepository.updateStatus(coordinate.id, "REPROCESSAR", {
      validadoPorIa: false,
    });
    const proxima = await this.geocodingAgent.geocodeSchool(
      school.id,
      this.enderecoCompleto(school),
      coordinate.tentativa + 1,
    );
    return { status: "REPROCESSANDO", anterior, proxima };
  }

  private async isConsistente(coordinate: SchoolCoordinate, school: School): Promise<boolean> {
    if (Number(coordinate.precisao) < RELEVANCIA_MINIMA) return false;

    const reverso = await this.geoEngine.reverseGeocode({
      latitude: Number(coordinate.latitude),
      longitude: Number(coordinate.longitude),
    });

    const cidadeConfere =
      reverso.cidade !== null && normalize(reverso.cidade) === normalize(school.cidade);
    const estadoConfere =
      reverso.estado !== null && reverso.estado.toUpperCase() === school.estado.toUpperCase();

    return cidadeConfere && estadoConfere;
  }

  private enderecoCompleto(school: School): string {
    return `${school.logradouro}, ${school.numero}, ${school.bairro}, ${school.cidade} - ${school.estado}, ${school.cep}`;
  }
}
