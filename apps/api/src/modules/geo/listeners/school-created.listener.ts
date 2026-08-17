import { Injectable, Logger } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";


import { GeoPipelineService } from "../geo-pipeline.service";

import type { SchoolCreatedEvent } from "@/modules/schools/events/school-created.event";

import { SCHOOL_CREATED_EVENT } from "@/modules/schools/events/school-created.event";

/**
 * "Quem deve colocar a latitude e longitude e endereço é a IA, não o
 * usuário manualmente" (pedido do usuário) — toda escola criada pelo
 * cadastro manual (Empresa/Gestor/Admin Rotta, `POST /schools`) ou por
 * importação em massa (`POST /schools/import`) chega aqui SEM
 * coordenadas; este listener chama a mesma Geocoding/Validation AI
 * Agent (`GeoPipelineService.geocodeSchool`, Nominatim/OSM via
 * `GeoEngineService`) que já resolve isso pro autocadastro do
 * Responsável e pro Education Sync Agent — nunca inventa uma
 * coordenada, nunca bloqueia o cadastro em si (endereço sem
 * correspondência no Nominatim cai na Fila de Revisão Manual, a escola
 * continua existindo e utilizável, só sem pino no mapa até alguém
 * revisar).
 */
@Injectable()
export class SchoolCreatedListener {
  private readonly logger = new Logger(SchoolCreatedListener.name);

  constructor(private readonly geoPipelineService: GeoPipelineService) {}

  @OnEvent(SCHOOL_CREATED_EVENT)
  async handle(event: SchoolCreatedEvent): Promise<void> {
    try {
      await this.geoPipelineService.geocodeSchool(event.schoolId);
    } catch (error) {
      this.logger.warn(`Não foi possível geocodificar automaticamente a escola ${event.schoolId}.`);
      this.logger.warn(error instanceof Error ? error.message : String(error));
    }
  }
}
