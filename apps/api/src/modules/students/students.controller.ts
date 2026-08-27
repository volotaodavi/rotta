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
  Put,
  Query,
  Req,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ApiBearerAuth, ApiConsumes, ApiTags } from "@nestjs/swagger";

import { CreateStudentAddressOverrideDto } from "./dto/create-student-address-override.dto";
import { CreateStudentAuthorizedPersonDto } from "./dto/create-student-authorized-person.dto";
import { CreateStudentDto } from "./dto/create-student.dto";
import { ListStudentsQueryDto } from "./dto/list-students-query.dto";
import { MarkStudentDailyAbsenceDto } from "./dto/mark-student-daily-absence.dto";
import { UpdateStudentDto } from "./dto/update-student.dto";
import { StudentsService, type RequestMeta } from "./students.service";

import type { Request } from "express";

import { CurrentUser, type AuthenticatedUser } from "@/common/decorators/current-user.decorator";
import { Roles } from "@/common/decorators/roles.decorator";
import { Role } from "@/shared/enums";

/** Cadastro/edição/exclusão/foto/pessoas autorizadas: exclusivo do Responsável dono do aluno. */
const OWNER_ROLES = [Role.RESPONSAVEL] as const;
/** Leitura: Responsável (próprios alunos) + Empresa/Gestor/Motorista/Monitor (escopados via Contract) + Admin Rotta. */
const READ_ROLES = [
  Role.RESPONSAVEL,
  Role.EMPRESA,
  Role.GESTOR,
  Role.MOTORISTA,
  Role.MONITOR,
  Role.ADMIN_ROTTA,
] as const;

function requestMeta(req: Request): RequestMeta {
  return { ip: req.ip, userAgent: req.headers["user-agent"] };
}

/**
 * API REST do módulo Alunos (briefing "Marketplace" §"CADASTRO DO
 * ALUNO"). Rotas literais (`:id/photo`, `:id/audit-logs`,
 * `:id/authorized-persons`) declaradas depois de `:id` pois nunca
 * colidem com nenhum verbo reservado (mesma disciplina de
 * `SchoolsController`, ali necessária por causa de `check-duplicates`).
 */
@ApiTags("students")
@ApiBearerAuth()
@Controller("students")
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  @Post()
  @Roles(...OWNER_ROLES)
  create(
    @Body() dto: CreateStudentDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.studentsService.create(dto, actor, requestMeta(req));
  }

  @Get()
  @Roles(...READ_ROLES)
  list(@Query() query: ListStudentsQueryDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.studentsService.list(query, actor);
  }

  @Get(":id")
  @Roles(...READ_ROLES)
  findById(@Param("id", ParseUUIDPipe) id: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.studentsService.findByIdOrThrow(id, actor);
  }

  @Patch(":id")
  @Roles(...OWNER_ROLES)
  update(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateStudentDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.studentsService.update(id, dto, actor, requestMeta(req));
  }

  @Delete(":id")
  @Roles(...OWNER_ROLES)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.studentsService.remove(id, actor, requestMeta(req));
  }

  @Post(":id/photo")
  @Roles(...OWNER_ROLES)
  @ApiConsumes("multipart/form-data")
  @UseInterceptors(FileInterceptor("file", { limits: { fileSize: 5 * 1024 * 1024 } }))
  uploadPhoto(
    @Param("id", ParseUUIDPipe) id: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.studentsService.uploadPhoto(id, file, actor, requestMeta(req));
  }

  @Get(":id/audit-logs")
  @Roles(...OWNER_ROLES)
  listAuditLogs(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Query("page") page = 1,
    @Query("pageSize") pageSize = 20,
  ) {
    return this.studentsService.listAuditLogs(id, actor, Number(page), Number(pageSize));
  }

  @Post(":id/authorized-persons")
  @Roles(...OWNER_ROLES)
  createAuthorizedPerson(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: CreateStudentAuthorizedPersonDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.studentsService.createAuthorizedPerson(id, dto, actor, requestMeta(req));
  }

  @Get(":id/authorized-persons")
  @Roles(...OWNER_ROLES)
  listAuthorizedPersons(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.studentsService.listAuthorizedPersons(id, actor);
  }

  @Delete(":id/authorized-persons/:personId")
  @Roles(...OWNER_ROLES)
  @HttpCode(HttpStatus.NO_CONTENT)
  removeAuthorizedPerson(
    @Param("id", ParseUUIDPipe) id: string,
    @Param("personId", ParseUUIDPipe) personId: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.studentsService.removeAuthorizedPerson(id, personId, actor, requestMeta(req));
  }

  /**
   * `PUT` (não `POST`): idempotente por dia — reenviar o mesmo dia
   * substitui o desvio anterior daquele dia, nunca acumula (pedido do
   * usuário: "um endereço alternativo por dia", `@@unique([studentId,
   * data])` no schema).
   */
  @Put(":id/address-overrides")
  @Roles(...OWNER_ROLES)
  upsertAddressOverride(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: CreateStudentAddressOverrideDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.studentsService.upsertAddressOverride(id, dto, actor, requestMeta(req));
  }

  @Get(":id/address-overrides")
  @Roles(...OWNER_ROLES)
  listAddressOverrides(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Query("from") from?: string,
    @Query("to") to?: string,
  ) {
    return this.studentsService.listAddressOverrides(id, actor, from, to);
  }

  @Delete(":id/address-overrides/:overrideId")
  @Roles(...OWNER_ROLES)
  @HttpCode(HttpStatus.NO_CONTENT)
  removeAddressOverride(
    @Param("id", ParseUUIDPipe) id: string,
    @Param("overrideId", ParseUUIDPipe) overrideId: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.studentsService.removeAddressOverride(id, overrideId, actor, requestMeta(req));
  }

  @Get(":id/ausencia-hoje")
  @Roles(...OWNER_ROLES)
  getAusenciaHoje(@Param("id", ParseUUIDPipe) id: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.studentsService.getAusenciaHoje(id, actor);
  }

  /**
   * "Meu filho não vai hoje" (Epic C) — sempre o dia corrente; bloqueia
   * (mesmo guard de `address-overrides`) se a viagem do dia já
   * começou.
   */
  @Post(":id/ausencia-hoje")
  @Roles(...OWNER_ROLES)
  marcarAusenciaHoje(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: MarkStudentDailyAbsenceDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.studentsService.marcarAusenciaHoje(id, dto, actor, requestMeta(req));
  }

  @Delete(":id/ausencia-hoje")
  @Roles(...OWNER_ROLES)
  @HttpCode(HttpStatus.NO_CONTENT)
  removerAusenciaHoje(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.studentsService.removerAusenciaHoje(id, actor, requestMeta(req));
  }
}
