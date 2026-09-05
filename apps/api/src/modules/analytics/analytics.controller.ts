import { Controller, Get, Query, Res } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";

import { AnalyticsService } from "./analytics.service";
import { ExportNationalQueryDto } from "./dto/export-national-query.dto";
import { NationalKpisQueryDto } from "./dto/national-kpis-query.dto";

import type { Response } from "express";

import { Roles } from "@/common/decorators/roles.decorator";
import { Role } from "@/shared/enums";

/**
 * API REST do Analytics (Prompt 22/Dossiê 30) — Central de Inteligência
 * Operacional. Exclusivo de `Role.ADMIN_ROTTA` em TODOS os endpoints,
 * mesmo padrão de `BackofficeController` (Dossiê 29) — é visão
 * nacional/cross-tenant, nunca escopada a uma empresa.
 */
@ApiTags("analytics")
@ApiBearerAuth()
@Controller("analytics")
@Roles(Role.ADMIN_ROTTA)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get("national/kpis")
  getNationalKpis(@Query() query: NationalKpisQueryDto) {
    return this.analyticsService.getNationalKpis(query);
  }

  @Get("national/heatmap")
  getHeatmap() {
    return this.analyticsService.getHeatmap();
  }

  /** `@Res()` sem `passthrough` — mesmo motivo de `VehiclesController.export`: o binário não pode passar pelo `TransformResponseInterceptor`. */
  @Get("national/export")
  async exportNational(
    @Query() query: ExportNationalQueryDto,
    @Res() res: Response,
  ): Promise<void> {
    const { buffer, contentType, filename } = await this.analyticsService.exportNational(query);
    res
      .status(200)
      .set({
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${filename}"`,
      })
      .send(buffer);
  }

  /** "Analytics AI" — stub honesto (ver `AnalyticsService.getAnomalies`). */
  @Get("anomalies")
  getAnomalies() {
    return this.analyticsService.getAnomalies();
  }
}
