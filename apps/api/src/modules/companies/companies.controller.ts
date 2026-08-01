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
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ApiBearerAuth, ApiConsumes, ApiTags } from "@nestjs/swagger";

import { CompaniesService, type RequestMeta } from "./companies.service";
import { ChangePlanDto } from "./dto/change-plan.dto";
import { CreateCompanyDto } from "./dto/create-company.dto";
import { ListCompaniesQueryDto } from "./dto/list-companies-query.dto";
import { SuspendCompanyDto } from "./dto/suspend-company.dto";
import { UpdateCompanySettingsDto } from "./dto/update-company-settings.dto";
import { UpdateCompanyDto } from "./dto/update-company.dto";

import type { Request } from "express";

import { CurrentUser, type AuthenticatedUser } from "@/common/decorators/current-user.decorator";
import { Roles } from "@/common/decorators/roles.decorator";
import { Role } from "@/shared/enums";

const TENANT_ROLES = [
  Role.EMPRESA,
  Role.GESTOR,
  Role.MOTORISTA,
  Role.MONITOR,
  Role.RESPONSAVEL,
  Role.ESCOLA,
] as const;

function requestMeta(req: Request): RequestMeta {
  return { ip: req.ip, userAgent: req.headers["user-agent"] };
}

/**
 * API REST do módulo Empresas (Dossiê 16). Versionada pelo prefixo
 * global `v1` (Dossiê 12 §17.3, `main.ts`). RBAC por endpoint definido
 * em cada método — ver a justificativa completa em `companies.module.ts`.
 */
@ApiTags("companies")
@ApiBearerAuth()
@Controller("companies")
export class CompaniesController {
  constructor(private readonly companiesService: CompaniesService) {}

  @Post()
  @Roles(Role.ADMIN_ROTTA)
  create(
    @Body() dto: CreateCompanyDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.companiesService.create(dto, actor, requestMeta(req));
  }

  @Get()
  @Roles(Role.ADMIN_ROTTA)
  list(@Query() query: ListCompaniesQueryDto) {
    return this.companiesService.list(query);
  }

  @Get(":id")
  @Roles(Role.ADMIN_ROTTA, ...TENANT_ROLES)
  findById(@Param("id", ParseUUIDPipe) id: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.companiesService.findByIdOrThrow(id, actor);
  }

  @Patch(":id")
  @Roles(Role.ADMIN_ROTTA, Role.EMPRESA, Role.GESTOR)
  update(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateCompanyDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.companiesService.update(id, dto, actor, requestMeta(req));
  }

  @Delete(":id")
  @Roles(Role.ADMIN_ROTTA)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.companiesService.remove(id, actor, requestMeta(req));
  }

  @Post(":id/suspend")
  @Roles(Role.ADMIN_ROTTA)
  suspend(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: SuspendCompanyDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.companiesService.suspend(id, dto, actor, requestMeta(req));
  }

  @Post(":id/reactivate")
  @Roles(Role.ADMIN_ROTTA)
  reactivate(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.companiesService.reactivate(id, actor, requestMeta(req));
  }

  @Patch(":id/plan")
  @Roles(Role.ADMIN_ROTTA, Role.EMPRESA)
  changePlan(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: ChangePlanDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.companiesService.changePlan(id, dto, actor, requestMeta(req));
  }

  @Get(":id/dashboard")
  @Roles(Role.ADMIN_ROTTA, Role.EMPRESA, Role.GESTOR)
  getDashboard(@Param("id", ParseUUIDPipe) id: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.companiesService.getDashboard(id, actor);
  }

  @Get(":id/settings")
  @Roles(Role.ADMIN_ROTTA, Role.EMPRESA, Role.GESTOR)
  getSettings(@Param("id", ParseUUIDPipe) id: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.companiesService.getSettings(id, actor);
  }

  @Patch(":id/settings")
  @Roles(Role.ADMIN_ROTTA, Role.EMPRESA, Role.GESTOR)
  updateSettings(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateCompanySettingsDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.companiesService.updateSettings(id, dto, actor, requestMeta(req));
  }

  @Get(":id/audit-logs")
  @Roles(Role.ADMIN_ROTTA, Role.EMPRESA, Role.GESTOR)
  listAuditLogs(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Query("page") page = 1,
    @Query("pageSize") pageSize = 20,
  ) {
    return this.companiesService.listAuditLogs(id, actor, Number(page), Number(pageSize));
  }

  @Post(":id/logo")
  @Roles(Role.ADMIN_ROTTA, Role.EMPRESA, Role.GESTOR)
  @ApiConsumes("multipart/form-data")
  @UseInterceptors(FileInterceptor("file", { limits: { fileSize: 5 * 1024 * 1024 } }))
  uploadLogo(
    @Param("id", ParseUUIDPipe) id: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.companiesService.uploadLogo(id, file, actor, requestMeta(req));
  }

  @Post(":id/photo")
  @Roles(Role.ADMIN_ROTTA, Role.EMPRESA, Role.GESTOR)
  @ApiConsumes("multipart/form-data")
  @UseInterceptors(FileInterceptor("file", { limits: { fileSize: 5 * 1024 * 1024 } }))
  uploadPhoto(
    @Param("id", ParseUUIDPipe) id: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.companiesService.uploadPhoto(id, file, actor, requestMeta(req));
  }
}
