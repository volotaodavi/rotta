import { Body, Controller, Get, Inject, Param, ParseUUIDPipe, Patch, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";


import { RevisarCoordinateDto } from "./dto/revisar-coordinate.dto";
import { GeoPipelineService } from "./geo-pipeline.service";
import { SCHOOL_COORDINATE_REPOSITORY } from "./geo.constants";

import type { SchoolCoordinateRepository } from "./repositories/school-coordinate.repository";

import { Roles } from "@/common/decorators/roles.decorator";
import { Role } from "@/shared/enums";

const MANAGE_ROLES = [Role.ADMIN_ROTTA, Role.EMPRESA, Role.GESTOR] as const;

/**
 * API REST do Rotta Geo Engine/Geo Platform (briefing "ROTTA GEO
 * PLATFORM" §"API" — "Criar APIs REST completas. Versionadas. Swagger.
 * DTOs. Validações."). Escopo desta primeira fatia: geocodificação de
 * Escolas (Geocoding AI Agent + Validation AI Agent) e a Fila de
 * Revisão Manual — as mesmas roles que já gerenciam o catálogo de
 * Escolas (`SchoolsController`).
 */
@ApiTags("geo")
@ApiBearerAuth()
@Controller("geo")
export class GeoController {
  constructor(
    private readonly geoPipeline: GeoPipelineService,
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
}
