import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";


import { InepSyncService } from "./agents/inep-sync.service";
import { MapIntelligenceService } from "./agents/map-intelligence.service";
import { ListMapMarkersQueryDto } from "./dto/list-map-markers-query.dto";
import { ListNearbySchoolsQueryDto } from "./dto/list-nearby-schools-query.dto";
import { RevisarCoordinateDto } from "./dto/revisar-coordinate.dto";
import { GeoPipelineService } from "./geo-pipeline.service";
import { SCHOOL_COORDINATE_REPOSITORY } from "./geo.constants";

import type { SchoolCoordinateRepository } from "./repositories/school-coordinate.repository";

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
    private readonly inepSync: InepSyncService,
    private readonly mapIntelligence: MapIntelligenceService,
    @Inject(SCHOOL_COORDINATE_REPOSITORY)
    private readonly coordinateRepository: SchoolCoordinateRepository,
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

  /** Education Sync Agent — dispara a sincronização com o Censo Escolar (INEP/MEC) do ano informado. */
  @Post("inep-sync")
  @Roles(...SYNC_ROLES)
  sincronizarInep(@Query("ano", ParseIntPipe) ano: number) {
    return this.inepSync.sincronizar(ano);
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
