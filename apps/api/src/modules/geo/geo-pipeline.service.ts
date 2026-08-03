import { Inject, Injectable, NotFoundException } from "@nestjs/common";


import { GeocodingAiAgentService } from "./agents/geocoding-ai-agent.service";
import { ValidationAiAgentService } from "./agents/validation-ai-agent.service";
import { SCHOOL_COORDINATE_REPOSITORY } from "./geo.constants";

import type { SchoolCoordinateRepository } from "./repositories/school-coordinate.repository";
import type { SchoolRepository } from "@/modules/schools/repositories/school.repository";
import type { SchoolCoordinate } from "@prisma/client";

import { SCHOOL_REPOSITORY } from "@/modules/schools/schools.constants";

const MAX_TENTATIVAS = 3;

/**
 * Orquestra o fluxo completo da Rotta Geo Platform para UMA escola já
 * cadastrada (briefing §"FLUXO COMPLETO": Geocoding AI Agent → Mapbox →
 * Validation AI Agent → aprovado/reprocessar). Disparado tanto por uma
 * ação manual (`GeoController`, Empresa/Gestor/Admin Rotta pedindo para
 * geocodificar/regeocodificar uma escola) quanto automaticamente pelo
 * Education Sync Agent (`InepSyncService`) para toda escola nova ou com
 * endereço alterado detectada na sincronização com o Censo Escolar.
 *
 * O laço de `REPROCESSANDO` é limitado pelo próprio `ValidationAiAgentService`
 * (nunca reprocessa além de `MAX_TENTATIVAS`) — o `for` aqui é só uma
 * segunda trava defensiva, nunca a única, para garantir que este método
 * NUNCA entra em loop infinito mesmo que a regra de corte mude.
 */
@Injectable()
export class GeoPipelineService {
  constructor(
    private readonly geocodingAgent: GeocodingAiAgentService,
    private readonly validationAgent: ValidationAiAgentService,
    @Inject(SCHOOL_REPOSITORY)
    private readonly schoolRepository: SchoolRepository,
    @Inject(SCHOOL_COORDINATE_REPOSITORY)
    private readonly coordinateRepository: SchoolCoordinateRepository,
  ) {}

  async geocodeSchool(schoolId: string): Promise<SchoolCoordinate> {
    const school = await this.schoolRepository.findById(schoolId);
    if (!school) {
      throw new NotFoundException("Escola não encontrada.");
    }

    const endereco = `${school.logradouro}, ${school.numero}, ${school.bairro}, ${school.cidade} - ${school.estado}, ${school.cep}`;

    let coordinate = await this.geocodingAgent.geocodeSchool(school.id, endereco, 1);

    for (let iteracao = 0; iteracao < MAX_TENTATIVAS; iteracao += 1) {
      const outcome = await this.validationAgent.validate(coordinate, school);
      if (outcome.status !== "REPROCESSANDO") {
        return outcome.coordinate;
      }
      coordinate = outcome.proxima;
    }

    return coordinate;
  }

  /**
   * Correção manual de uma coordenada na Fila de Revisão Manual
   * (briefing "IMPORTANTE" — 3 tentativas automáticas esgotadas, um
   * humano decide). Nunca sobrescreve a linha `REVISAO_MANUAL`: grava
   * uma NOVA tentativa (`fonte: MANUAL`, já `VALIDADO`, sem passar pelo
   * Validation AI Agent — a fonte é a decisão humana, não o Nominatim) e
   * atualiza `School.latitude`/`longitude`, mesmo efeito final de uma
   * aprovação automática.
   */
  async resolveManualReview(coordinateId: string, input: { latitude: number; longitude: number }) {
    const anterior = await this.coordinateRepository.findById(coordinateId);
    if (!anterior || anterior.status !== "REVISAO_MANUAL") {
      throw new NotFoundException("Coordenada não encontrada na fila de revisão manual.");
    }

    const school = await this.schoolRepository.findById(anterior.schoolId);
    if (!school) {
      throw new NotFoundException("Escola não encontrada.");
    }

    const revisada = await this.coordinateRepository.create({
      schoolId: anterior.schoolId,
      latitude: input.latitude,
      longitude: input.longitude,
      precisao: "1.00",
      fonte: "MANUAL",
      tentativa: anterior.tentativa + 1,
    });
    const validada = await this.coordinateRepository.updateStatus(revisada.id, "VALIDADO", {
      validadoPorIa: false,
    });
    await this.schoolRepository.update(school.id, {
      latitude: input.latitude,
      longitude: input.longitude,
    });

    return validada;
  }
}
