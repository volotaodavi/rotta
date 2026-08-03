import { Module } from "@nestjs/common";


import { GeocodingAiAgentService } from "./agents/geocoding-ai-agent.service";
import { ValidationAiAgentService } from "./agents/validation-ai-agent.service";
import { GeoEngineService } from "./geo-engine.service";
import { GeoPipelineService } from "./geo-pipeline.service";
import { SCHOOL_COORDINATE_REPOSITORY } from "./geo.constants";
import { GeoController } from "./geo.controller";
import { PrismaSchoolCoordinateRepository } from "./repositories/prisma-school-coordinate.repository";

import { SchoolsModule } from "@/modules/schools/schools.module";

/**
 * Rotta Geo Platform (briefing "ROTTA GEO PLATFORM") — `GeoEngineService`
 * é a ÚNICA porta de saída para o Mapbox de todo o backend; os agentes
 * de geocodificação (`GeocodingAiAgentService`/`ValidationAiAgentService`)
 * e o orquestrador (`GeoPipelineService`) vivem aqui, sobre o catálogo
 * de Escolas. Importa `SchoolsModule` (nunca o contrário — `SchoolsModule`
 * não conhece este módulo) para ler/gravar `School.latitude`/
 * `longitude` via `SCHOOL_REPOSITORY`, sem depender do `SchoolsService`
 * orientado a ator humano/RBAC (ver nota em `schools.module.ts`).
 */
@Module({
  imports: [SchoolsModule],
  controllers: [GeoController],
  providers: [
    GeoEngineService,
    GeocodingAiAgentService,
    ValidationAiAgentService,
    GeoPipelineService,
    { provide: SCHOOL_COORDINATE_REPOSITORY, useClass: PrismaSchoolCoordinateRepository },
  ],
  exports: [GeoEngineService, GeoPipelineService],
})
export class GeoModule {}
