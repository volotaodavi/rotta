import { BullModule } from "@nestjs/bullmq";
import { Module } from "@nestjs/common";

import { GeocodingAiAgentService } from "./agents/geocoding-ai-agent.service";
import { InepSyncSchedulerService } from "./agents/inep-sync-scheduler.service";
import { InepSyncService } from "./agents/inep-sync.service";
import { MapIntelligenceService } from "./agents/map-intelligence.service";
import { ValidationAiAgentService } from "./agents/validation-ai-agent.service";
import { GeoEngineService } from "./geo-engine.service";
import { GeoPipelineService } from "./geo-pipeline.service";
import {
  INEP_SYNC_QUEUE,
  SCHOOL_COORDINATE_REPOSITORY,
  SCHOOL_GEOCODE_QUEUE,
  SCHOOL_MARKER_REPOSITORY,
} from "./geo.constants";
import { GeoController } from "./geo.controller";
import { InepSyncProcessor } from "./processors/inep-sync.processor";
import { SchoolGeocodeProcessor } from "./processors/school-geocode.processor";
import { PrismaSchoolCoordinateRepository } from "./repositories/prisma-school-coordinate.repository";
import { PrismaSchoolMarkerRepository } from "./repositories/prisma-school-marker.repository";

import { SchoolsModule } from "@/modules/schools/schools.module";

/**
 * Rotta Geo Platform (briefing "ROTTA GEO PLATFORM") — `GeoEngineService`
 * é a ÚNICA porta de saída para o Mapbox de todo o backend; os agentes
 * de geocodificação (`GeocodingAiAgentService`/`ValidationAiAgentService`),
 * o Education Sync Agent (`InepSyncService`), o Map Intelligence Agent
 * (`MapIntelligenceService`) e o orquestrador (`GeoPipelineService`)
 * vivem aqui, sobre o catálogo de Escolas. Importa `SchoolsModule`
 * (nunca o contrário — `SchoolsModule` não conhece este módulo) para
 * ler/gravar `School.latitude`/`longitude` via `SCHOOL_REPOSITORY`, sem
 * depender do `SchoolsService` orientado a ator humano/RBAC (ver nota em
 * `schools.module.ts`). Não importa `RedisModule` (é `@Global()`,
 * `RedisService` já está disponível para `MapIntelligenceService`).
 */
@Module({
  imports: [
    SchoolsModule,
    BullModule.registerQueue({ name: SCHOOL_GEOCODE_QUEUE }, { name: INEP_SYNC_QUEUE }),
  ],
  controllers: [GeoController],
  providers: [
    GeoEngineService,
    GeocodingAiAgentService,
    ValidationAiAgentService,
    GeoPipelineService,
    InepSyncService,
    InepSyncSchedulerService,
    MapIntelligenceService,
    SchoolGeocodeProcessor,
    InepSyncProcessor,
    { provide: SCHOOL_COORDINATE_REPOSITORY, useClass: PrismaSchoolCoordinateRepository },
    { provide: SCHOOL_MARKER_REPOSITORY, useClass: PrismaSchoolMarkerRepository },
  ],
  exports: [GeoEngineService, GeoPipelineService, InepSyncService, MapIntelligenceService],
})
export class GeoModule {}
