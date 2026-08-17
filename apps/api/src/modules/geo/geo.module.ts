import { Module } from "@nestjs/common";


import { GeocodingAiAgentService } from "./agents/geocoding-ai-agent.service";
import { InepSyncSchedulerService } from "./agents/inep-sync-scheduler.service";
import { InepSyncService } from "./agents/inep-sync.service";
import { MapIntelligenceService } from "./agents/map-intelligence.service";
import { ValidationAiAgentService } from "./agents/validation-ai-agent.service";
import { GeoEngineService } from "./geo-engine.service";
import { GeoPipelineService } from "./geo-pipeline.service";
import { GeoQueueController } from "./geo-queue.controller";
import { SCHOOL_COORDINATE_REPOSITORY, SCHOOL_MARKER_REPOSITORY } from "./geo.constants";
import { GeoController } from "./geo.controller";
import { SchoolCreatedListener } from "./listeners/school-created.listener";
import { PrismaSchoolCoordinateRepository } from "./repositories/prisma-school-coordinate.repository";
import { PrismaSchoolMarkerRepository } from "./repositories/prisma-school-marker.repository";

import { SchoolsModule } from "@/modules/schools/schools.module";

/**
 * Rotta Geo Platform (briefing "ROTTA GEO PLATFORM") — `GeoEngineService`
 * é a ÚNICA porta de saída para Nominatim/OSRM de todo o backend; os agentes
 * de geocodificação (`GeocodingAiAgentService`/`ValidationAiAgentService`),
 * o Education Sync Agent (`InepSyncService`), o Map Intelligence Agent
 * (`MapIntelligenceService`) e o orquestrador (`GeoPipelineService`)
 * vivem aqui, sobre o catálogo de Escolas. Importa `SchoolsModule`
 * (nunca o contrário — `SchoolsModule` não conhece este módulo) para
 * ler/gravar `School.latitude`/`longitude` via `SCHOOL_REPOSITORY`, sem
 * depender do `SchoolsService` orientado a ator humano/RBAC (ver nota em
 * `schools.module.ts`). Não importa `RedisModule` (é `@Global()`,
 * `RedisService` já está disponível para `MapIntelligenceService`) nem
 * `QueueModule` (também `@Global()` — `QstashPublisherService`/
 * `QstashScheduleService` já disponíveis para `InepSyncService`/
 * `GeoController`/`InepSyncSchedulerService`).
 *
 * `GeoQueueController` é o "worker" dos jobs assíncronos deste módulo
 * (`school-geocode`/`inep-sync`, ver `geo-queue.types.ts`) — substitui
 * `SchoolGeocodeProcessor`/`InepSyncProcessor` (BullMQ).
 *
 * `SchoolCreatedListener` fecha o gap "quem deve colocar a latitude e
 * longitude é a IA, não o usuário" (pedido do usuário): reage ao
 * `SCHOOL_CREATED_EVENT` emitido por `SchoolsService` (cadastro manual/
 * importação) chamando `GeoPipelineService.geocodeSchool` — o mesmo elo
 * que faltava entre "Nova escola" e a Geo Platform que já existia pra
 * autocadastro/Censo Escolar.
 */
@Module({
  imports: [SchoolsModule],
  controllers: [GeoController, GeoQueueController],
  providers: [
    GeoEngineService,
    GeocodingAiAgentService,
    ValidationAiAgentService,
    GeoPipelineService,
    InepSyncService,
    InepSyncSchedulerService,
    MapIntelligenceService,
    SchoolCreatedListener,
    { provide: SCHOOL_COORDINATE_REPOSITORY, useClass: PrismaSchoolCoordinateRepository },
    { provide: SCHOOL_MARKER_REPOSITORY, useClass: PrismaSchoolMarkerRepository },
  ],
  exports: [GeoEngineService, GeoPipelineService, InepSyncService, MapIntelligenceService],
})
export class GeoModule {}
