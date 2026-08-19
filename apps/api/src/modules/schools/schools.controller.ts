import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ApiBearerAuth, ApiConsumes, ApiTags } from "@nestjs/swagger";

import { BulkUpdateSchoolStatusDto } from "./dto/bulk-update-school-status.dto";
import { CreateSchoolAccessPointDto } from "./dto/create-school-access-point.dto";
import { CreateSchoolCompanyLinkDto } from "./dto/create-school-company-link.dto";
import { CreateSchoolDto } from "./dto/create-school.dto";
import { ExportSchoolsQueryDto } from "./dto/export-schools-query.dto";
import { ImportSchoolsDto } from "./dto/import-schools.dto";
import { ListSchoolsQueryDto } from "./dto/list-schools-query.dto";
import { SuggestSchoolsQueryDto } from "./dto/suggest-schools-query.dto";
import { UpdateSchoolAccessPointDto } from "./dto/update-school-access-point.dto";
import { UpdateSchoolStatusDto } from "./dto/update-school-status.dto";
import { UpdateSchoolDto } from "./dto/update-school.dto";
import { SchoolsService, type RequestMeta } from "./schools.service";

import type { Request, Response } from "express";

import { CurrentUser, type AuthenticatedUser } from "@/common/decorators/current-user.decorator";
import { Roles } from "@/common/decorators/roles.decorator";
import { Role } from "@/shared/enums";

const MANAGE_ROLES = [Role.ADMIN_ROTTA, Role.EMPRESA, Role.GESTOR] as const;
const READ_ROLES = [...MANAGE_ROLES, Role.MOTORISTA, Role.MONITOR, Role.RESPONSAVEL] as const;

function requestMeta(req: Request): RequestMeta {
  return { ip: req.ip, userAgent: req.headers["user-agent"] };
}

/**
 * API REST do módulo Escolas (briefing "Gestão de Escolas"). Rotas
 * literais (`check-duplicates`, `dashboard`, `export`, `import`) são
 * declaradas ANTES de `:id`, mesma precaução de `VehiclesController`.
 */
@ApiTags("schools")
@ApiBearerAuth()
@Controller("schools")
export class SchoolsController {
  constructor(private readonly schoolsService: SchoolsService) {}

  @Post()
  @Roles(...MANAGE_ROLES)
  create(
    @Body() dto: CreateSchoolDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.schoolsService.create(dto, actor, requestMeta(req));
  }

  @Get()
  @Roles(...READ_ROLES)
  list(@Query() query: ListSchoolsQueryDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.schoolsService.list(query, actor);
  }

  /**
   * Autocomplete de escola pro Responsável (pedido do usuário: "mesmo
   * escrevendo errado... vai dar uma sugestão de escola baseada no nome
   * e localização") — mesmas `READ_ROLES` de `list()` (o Responsável já
   * podia ler o catálogo, só a busca por nome não era tolerante a erro
   * de digitação nem sabia usar a localização).
   */
  @Get("sugestoes")
  @Roles(...READ_ROLES)
  sugerirEscolas(@Query() query: SuggestSchoolsQueryDto) {
    return this.schoolsService.sugerirEscolas(query);
  }

  @Get("check-duplicates")
  @Roles(...MANAGE_ROLES)
  checkPossibleDuplicates(
    @Query("nomeOficial") nomeOficial: string,
    @Query("cidade") cidade: string,
    @Query("estado") estado: string,
  ) {
    return this.schoolsService.checkPossibleDuplicates(nomeOficial, cidade, estado);
  }

  @Get("dashboard")
  @Roles(...MANAGE_ROLES)
  getDashboard(@CurrentUser() actor: AuthenticatedUser, @Query("companyId") companyId?: string) {
    return this.schoolsService.getDashboard(actor, companyId);
  }

  /** `@Res()` sem `passthrough` — mesma razão de `VehiclesController.export`. */
  @Get("export")
  @Roles(...MANAGE_ROLES)
  async export(
    @Query() query: ExportSchoolsQueryDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Res() res: Response,
  ): Promise<void> {
    const { buffer, contentType, filename } = await this.schoolsService.exportList(
      query,
      actor,
      query.format,
    );
    res
      .status(200)
      .set({
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${filename}"`,
      })
      .send(buffer);
  }

  /**
   * Troca de status EM MASSA — literal, precisa vir antes de `:id/status`
   * (mesma precaução do resto da classe). Só Admin Rotta, ao contrário
   * de `:id/status` (`MANAGE_ROLES`): isto afeta o catálogo nacional
   * inteiro de uma vez, não uma escola de uma Empresa específica.
   */
  @Patch("status/bulk")
  @Roles(Role.ADMIN_ROTTA)
  bulkUpdateStatus(
    @Body() dto: BulkUpdateSchoolStatusDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.schoolsService.bulkUpdateStatus(dto, actor, requestMeta(req));
  }

  @Post("import")
  @Roles(...MANAGE_ROLES)
  @ApiConsumes("multipart/form-data")
  @UseInterceptors(FileInterceptor("file", { limits: { fileSize: 10 * 1024 * 1024 } }))
  importFile(
    @Body() dto: ImportSchoolsDto,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.schoolsService.importFromFile(file, dto.format, actor, requestMeta(req));
  }

  @Get(":id")
  @Roles(...READ_ROLES)
  findById(@Param("id", ParseUUIDPipe) id: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.schoolsService.findByIdOrThrow(id, actor);
  }

  @Patch(":id")
  @Roles(...MANAGE_ROLES)
  update(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateSchoolDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.schoolsService.update(id, dto, actor, requestMeta(req));
  }

  @Patch(":id/status")
  @Roles(...MANAGE_ROLES)
  updateStatus(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateSchoolStatusDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.schoolsService.updateStatus(id, dto, actor, requestMeta(req));
  }

  @Delete(":id")
  @Roles(...MANAGE_ROLES)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.schoolsService.remove(id, actor, requestMeta(req));
  }

  @Get(":id/audit-logs")
  @Roles(...MANAGE_ROLES)
  listAuditLogs(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Query("page") page = 1,
    @Query("pageSize") pageSize = 20,
  ) {
    return this.schoolsService.listAuditLogs(id, actor, Number(page), Number(pageSize));
  }

  // --- Portões e Pontos de Embarque (briefing "PORTÕES E PONTOS DE EMBARQUE") ---

  @Post(":id/access-points")
  @Roles(...MANAGE_ROLES)
  createAccessPoint(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: CreateSchoolAccessPointDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.schoolsService.createAccessPoint(id, dto, actor, requestMeta(req));
  }

  @Get(":id/access-points")
  @Roles(...READ_ROLES)
  listAccessPoints(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.schoolsService.listAccessPoints(id, actor);
  }

  @Patch(":id/access-points/:pointId")
  @Roles(...MANAGE_ROLES)
  updateAccessPoint(
    @Param("id", ParseUUIDPipe) id: string,
    @Param("pointId", ParseUUIDPipe) pointId: string,
    @Body() dto: UpdateSchoolAccessPointDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.schoolsService.updateAccessPoint(id, pointId, dto, actor, requestMeta(req));
  }

  @Delete(":id/access-points/:pointId")
  @Roles(...MANAGE_ROLES)
  @HttpCode(HttpStatus.NO_CONTENT)
  removeAccessPoint(
    @Param("id", ParseUUIDPipe) id: string,
    @Param("pointId", ParseUUIDPipe) pointId: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.schoolsService.removeAccessPoint(id, pointId, actor, requestMeta(req));
  }

  // --- Vínculo Empresa<->Escola (briefing "PERMISSÕES") ---

  @Post(":id/company-links")
  @Roles(...MANAGE_ROLES)
  linkCompany(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: CreateSchoolCompanyLinkDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.schoolsService.linkCompany(id, dto, actor, requestMeta(req));
  }

  @Get(":id/company-links")
  @Roles(...MANAGE_ROLES)
  listCompanyLinks(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.schoolsService.listCompanyLinks(id, actor);
  }

  @Delete(":id/company-links/:linkId")
  @Roles(...MANAGE_ROLES)
  @HttpCode(HttpStatus.NO_CONTENT)
  unlinkCompany(
    @Param("id", ParseUUIDPipe) id: string,
    @Param("linkId", ParseUUIDPipe) linkId: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.schoolsService.unlinkCompany(id, linkId, actor, requestMeta(req));
  }
}
