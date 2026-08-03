import { InjectQueue } from "@nestjs/bullmq";
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";


import { MapIntelligenceService } from "./agents/map-intelligence.service";
import { ListMapMarkersQueryDto } from "./dto/list-map-markers-query.dto";
import { ListNearbySchoolsQueryDto } from "./dto/list-nearby-schools-query.dto";
import { RevisarCoordinateDto } from "./dto/revisar-coordinate.dto";
import { GeoPipelineService } from "./geo-pipeline.service";
import { INEP_SYNC_QUEUE, SCHOOL_COORDINATE_REPOSITORY } from "./geo.constants";

import type { InepSyncJobData } from "./processors/inep-sync.processor";
import type { SchoolCoordinateRepository } from "./repositories/school-coordinate.repository";
import type { Queue } from "bullmq";

import { Roles } from "@/common/decorators/roles.decorator";
import { Role } from "@/shared/enums";

const MANAGE_ROLES = [Role.ADMIN_ROTTA, Role.EMPRESA, Role.GESTOR] as const;
/** Sincronizar com o Censo Escolar nacional é uma operação de escala/custo bem maior que gerenciar a própria base — só Admin Rotta dispara. */
const SYNC_ROLES = [Role.ADMIN_ROTTA] as const;
/** Ver marcadores no mapa é tão aberto quanto ver o catálogo de Escolas (`SchoolsController.READ_ROLES`). */
const VIEW_ROLES = [...MANAGE_ROLES, Role.MOTORISTA, Role.MONITOR, Role.RESPONSAVEL] as const;

/**
 * API REST do Rotta Geo Engine/Geo Platform (briefing "ROTTA GEO
 * PLATFORM" §"API" — "Criar APIs REST completas. Versionadas. Swagger.
 * DTOs. Validações."): geocodificação de Escolas (Geocoding AI Agent +
 * Validation AI Agent) e a Fila de Revisão Manual (mesmas roles que já
 * gerenciam o catálogo de Escolas, `SchoolsController.MANAGE_ROLES`),
 * sincronização INEP/MEC (Education Sync Agent, só Admin Rotta) e
 * marcadores do mapa (Map Intelligence Agent, mesmas roles que já
 * enxergam o catálogo de Escolas, `SchoolsController.READ_ROLES`).
 */
@ApiTags("geo")
@ApiBearerAuth()
@Controller("geo")
export class GeoController {
  constructor(
    private readonly geoPipeline: GeoPipelineService,
    private readonly mapIntelligence: MapIntelligenceService,
    @Inject(SCHOOL_COORDINATE_REPOSITORY)
    private readonly coordinateRepository: SchoolCoordinateRepository,
    @InjectQueue(INEP_SYNC_QUEUE)
    private readonly inepSyncQueue: Queue<InepSyncJobData>,
  ) {}

  @Post("schools/:schoolId/geocode")
  @Roles(...MANAGE_ROLES)
  geocodeSchool(@Param("schoolId", ParseUUIDPipe) schoolId: string) {
    return this.geoPipeline.geocodeSchool(schoolId);
  }

  @Get("schools/:schoolId/coordinates")
  @Roles(...MANAGE_ROLES)
  listSchoolCoordinates(@Param("schoolId", ParseUUIDPipe) schoolId: string) {
    return this.coordinateRepository.listBySchoolId(schoolId);
  }

  @Get("revisao-manual")
  @Roles(...MANAGE_ROLES)
  listRevisaoManual() {
    return this.coordinateRepository.listByStatus("REVISAO_MANUAL");
  }

  @Patch("coordinates/:id/revisar")
  @Roles(...MANAGE_ROLES)
  revisarCoordinate(@Param("id", ParseUUIDPipe) id: string, @Body() dto: RevisarCoordinateDto) {
    return this.geoPipeline.resolveManualReview(id, dto);
  }

  /**
   * Education Sync Agent — enfileira a sincronização com o Censo Escolar
   * (INEP/MEC) do ano informado (fila `inep-sync`, BullMQ) e responde
   * `202 Accepted` imediatamente: o download+parse+diff de ~200 mil
   * linhas nunca cabe dentro do tempo de uma requisição HTTP síncrona.
   * O resultado (`InepSyncResumo`) fica só nos logs do worker
   * (`InepSyncProcessor`) — não há hoje uma tela de acompanhamento.
   */
  @Post("inep-sync")
  @Roles(...SYNC_ROLES)
  @HttpCode(HttpStatus.ACCEPTED)
  async sincronizarInep(@Query("ano", ParseIntPipe) ano: number) {
    const job = await this.inepSyncQueue.add(
      "inep-sync-manual",
      { ano },
      { attempts: 3, backoff: { type: "exponential", delay: 60_000 } },
    );
    return { jobId: job.id, ano };
  }

  /** Map Intelligence Agent — marcadores de Escola dentro da janela visível do mapa. */
  @Get("mapa/marcadores")
  @Roles(...VIEW_ROLES)
  listarMarcadores(@Query() query: ListMapMarkersQueryDto) {
    return this.mapIntelligence.listarMarcadores(query);
  }

  /** Map Intelligence Agent — Escolas mais próximas de um ponto, ordenadas por distância. */
  @Get("mapa/proximas")
  @Roles(...VIEW_ROLES)
  listarProximas(@Query() query: ListNearbySchoolsQueryDto) {
    return this.mapIntelligence.listarProximas(
      { latitude: query.lat, longitude: query.lng },
      query.raioKm,
    );
  }
}
