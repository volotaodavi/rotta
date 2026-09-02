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
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";

import { AddRouteStudentDto } from "./dto/add-route-student.dto";
import { CreateRouteStopDto } from "./dto/create-route-stop.dto";
import { CreateRouteDto } from "./dto/create-route.dto";
import { ListRoutesQueryDto } from "./dto/list-routes-query.dto";
import { ReorderRouteStopsDto } from "./dto/reorder-route-stops.dto";
import { UpdateRouteStopDto } from "./dto/update-route-stop.dto";
import { UpdateRouteDto } from "./dto/update-route.dto";
import { RoutesService, type RequestMeta } from "./routes.service";

import type { Request } from "express";

import { CurrentUser, type AuthenticatedUser } from "@/common/decorators/current-user.decorator";
import { Roles } from "@/common/decorators/roles.decorator";
import { Role } from "@/shared/enums";

const CREATE_ROLES = [Role.EMPRESA, Role.GESTOR, Role.ADMIN_ROTTA] as const;
const MANAGE_ROLES = [Role.ADMIN_ROTTA, Role.EMPRESA, Role.GESTOR] as const;
const READ_ROLES = [...MANAGE_ROLES, Role.MOTORISTA, Role.MONITOR] as const;

function requestMeta(req: Request): RequestMeta {
  return { ip: req.ip, userAgent: req.headers["user-agent"] };
}

/**
 * API REST do módulo Rotas (ROT-01/02/04/07, Dossiê 13 Seção 10).
 * Sub-recursos de parada/aluno vivem sob `:id/stops` e `:id/students`
 * (mesma convenção aninhada de `vehicles.controller.ts`).
 */
@ApiTags("routes")
@ApiBearerAuth()
@Controller("routes")
export class RoutesController {
  constructor(private readonly routesService: RoutesService) {}

  @Post()
  @Roles(...CREATE_ROLES)
  create(
    @Body() dto: CreateRouteDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.routesService.create(dto, actor, requestMeta(req));
  }

  @Get()
  @Roles(...READ_ROLES)
  list(@Query() query: ListRoutesQueryDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.routesService.list(query, actor);
  }

  @Get(":id")
  @Roles(...READ_ROLES)
  findById(@Param("id", ParseUUIDPipe) id: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.routesService.findByIdOrThrow(id, actor);
  }

  @Patch(":id")
  @Roles(...MANAGE_ROLES)
  update(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateRouteDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.routesService.update(id, dto, actor, requestMeta(req));
  }

  @Delete(":id")
  @Roles(...MANAGE_ROLES)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.routesService.remove(id, actor, requestMeta(req));
  }

  @Get(":id/audit-logs")
  @Roles(...MANAGE_ROLES)
  listAuditLogs(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Query("page") page = 1,
    @Query("pageSize") pageSize = 20,
  ) {
    return this.routesService.listAuditLogs(id, actor, Number(page), Number(pageSize));
  }

  // --- Paradas (ROT-07) ---

  @Post(":id/stops")
  @Roles(...MANAGE_ROLES)
  addStop(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: CreateRouteStopDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.routesService.addStop(id, dto, actor);
  }

  @Get(":id/stops")
  @Roles(...READ_ROLES)
  listStops(@Param("id", ParseUUIDPipe) id: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.routesService.listStops(id, actor);
  }

  /**
   * Registrado ANTES de `:id/stops/:stopId` — senão o Nest tratasse
   * `reorder` como um `:stopId` literal e este handler nunca seria
   * alcançado (mesmo cuidado de rota literal x parâmetro já usado em
   * outros controllers desta sessão). Aplica de fato a ordem sugerida
   * pela Rotta Route AI (`RottaAiService.suggestRouteOptimization`) ou
   * qualquer reordenação manual — ver `RoutesService.reorderStops`.
   */
  @Patch(":id/stops/reorder")
  @Roles(...MANAGE_ROLES)
  reorderStops(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: ReorderRouteStopsDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.routesService.reorderStops(id, dto.stopIds, actor);
  }

  @Patch(":id/stops/:stopId")
  @Roles(...MANAGE_ROLES)
  updateStop(
    @Param("id", ParseUUIDPipe) id: string,
    @Param("stopId", ParseUUIDPipe) stopId: string,
    @Body() dto: UpdateRouteStopDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.routesService.updateStop(id, stopId, dto, actor);
  }

  @Delete(":id/stops/:stopId")
  @Roles(...MANAGE_ROLES)
  @HttpCode(HttpStatus.NO_CONTENT)
  removeStop(
    @Param("id", ParseUUIDPipe) id: string,
    @Param("stopId", ParseUUIDPipe) stopId: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.routesService.removeStop(id, stopId, actor);
  }

  // --- Alunos na rota (ROT-07/EMB-01 + RN-26) ---

  @Post(":id/students")
  @Roles(...MANAGE_ROLES)
  addStudent(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: AddRouteStudentDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.routesService.addStudent(id, dto, actor, requestMeta(req));
  }

  @Get(":id/students")
  @Roles(...READ_ROLES)
  listStudents(@Param("id", ParseUUIDPipe) id: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.routesService.listStudents(id, actor);
  }

  /**
   * `listStudents` + nome do aluno/escola/bairro/responsável (pedido do
   * usuário: card pré-início da viagem — "aparecerá as informações...
   * nome dos alunos, escolas, horário, bairros, responsáveis"). Endpoint
   * separado (não um `?detalhado=true` em `listStudents`) — mantém o
   * caminho de alta frequência (geofencing a cada ping de GPS) livre dos
   * joins extras que só fazem sentido uma vez, ao abrir o card.
   */
  @Get(":id/students/detalhado")
  @Roles(...READ_ROLES)
  listStudentsDetalhado(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.routesService.listStudentsDetalhado(id, actor);
  }

  @Delete(":id/students/:routeStudentId")
  @Roles(...MANAGE_ROLES)
  @HttpCode(HttpStatus.NO_CONTENT)
  removeStudent(
    @Param("id", ParseUUIDPipe) id: string,
    @Param("routeStudentId", ParseUUIDPipe) routeStudentId: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.routesService.removeStudent(id, routeStudentId, actor, requestMeta(req));
  }
}
