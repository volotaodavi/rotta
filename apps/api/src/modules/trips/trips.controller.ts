import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";

import { CreateTripStudentEventDto } from "./dto/create-trip-student-event.dto";
import { IngestPositionDto, IngestPositionsBatchDto } from "./dto/ingest-position.dto";
import { StartTripDto } from "./dto/start-trip.dto";
import { SubstituirMonitorDto } from "./dto/substituir-monitor.dto";
import { SubstituirMotoristaDto } from "./dto/substituir-motorista.dto";
import { SubstituirVeiculoDto } from "./dto/substituir-veiculo.dto";
import { TripsService, type RequestMeta } from "./trips.service";

import type { Request } from "express";

import { CurrentUser, type AuthenticatedUser } from "@/common/decorators/current-user.decorator";
import { Roles } from "@/common/decorators/roles.decorator";
import { Role } from "@/shared/enums";

const MANAGE_ROLES = [Role.ADMIN_ROTTA, Role.EMPRESA, Role.GESTOR] as const;
const OPERATE_ROLES = [...MANAGE_ROLES, Role.MOTORISTA, Role.MONITOR] as const;

function requestMeta(req: Request): RequestMeta {
  return { ip: req.ip, userAgent: req.headers["user-agent"] };
}

/**
 * API REST do módulo Trips (GPS-01/02/03/06 + EMB-01/05 + DESEMB-01/03,
 * Dossiê 13 Seção 11). O "localizador"/mapa em si (agregado por
 * empresa/por aluno) vive em `GpsController`, que só LÊ os dados que
 * este controller escreve.
 */
@ApiTags("trips")
@ApiBearerAuth()
@Controller("trips")
export class TripsController {
  constructor(private readonly tripsService: TripsService) {}

  @Post()
  @Roles(...OPERATE_ROLES)
  start(@Body() dto: StartTripDto, @CurrentUser() actor: AuthenticatedUser, @Req() req: Request) {
    return this.tripsService.start(dto, actor, requestMeta(req));
  }

  // Rota literal ("routes/:routeId/history") registrada ANTES de ":id"
  // — mesma precaução de `VehiclesController` ("dashboard"/"export"
  // antes de ":id") para nunca colidir com o parâmetro coringa.
  // Motorista/Monitor também podem ver o histórico da PRÓPRIA rota
  // (Prompt Mestre da Rotta, Seção 7 — o app do Motorista não vira um
  // painel administrativo, mas o histórico da rota atribuída a ele é
  // informação necessária, não interna da empresa). O controle de
  // acesso por registro continua em `RoutesService.findByIdOrThrow`
  // (chamado por `listByRoute`), que já restringe Motorista/Monitor às
  // próprias rotas — nunca a operação inteira da empresa.
  @Get("routes/:routeId/history")
  @Roles(...OPERATE_ROLES)
  listByRoute(
    @Param("routeId", ParseUUIDPipe) routeId: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Query("page") page = 1,
    @Query("pageSize") pageSize = 20,
  ) {
    return this.tripsService.listByRoute(routeId, actor, Number(page), Number(pageSize));
  }

  // Rota literal ("routes/:routeId/today") registrada ANTES de ":id"
  // pelo mesmo motivo de "routes/:routeId/history" acima. Usada pelo
  // app do Motorista/Monitor para saber se já existe viagem hoje sem
  // precisar chutar via `start` + tratar o 409.
  @Get("routes/:routeId/today")
  @Roles(...OPERATE_ROLES)
  findTodayByRoute(
    @Param("routeId", ParseUUIDPipe) routeId: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.tripsService.findTodayByRoute(routeId, actor);
  }

  @Get(":id")
  @Roles(...OPERATE_ROLES)
  findById(@Param("id", ParseUUIDPipe) id: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.tripsService.findByIdOrThrow(id, actor);
  }

  @Patch(":id/finish")
  @Roles(...OPERATE_ROLES)
  finish(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.tripsService.finish(id, actor, requestMeta(req));
  }

  @Patch(":id/pause")
  @Roles(...OPERATE_ROLES)
  pause(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.tripsService.pause(id, actor, requestMeta(req));
  }

  @Patch(":id/resume")
  @Roles(...OPERATE_ROLES)
  resume(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.tripsService.resume(id, actor, requestMeta(req));
  }

  @Patch(":id/cancel")
  @Roles(...OPERATE_ROLES)
  cancel(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.tripsService.cancel(id, actor, requestMeta(req));
  }

  // --- Substituição pontual do dia (ROT-05/06, tarefa #102) — só quem
  // gerencia decide, nunca o próprio Motorista/Monitor. ---

  @Patch(":id/substituir-motorista")
  @Roles(...MANAGE_ROLES)
  substituirMotorista(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: SubstituirMotoristaDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.tripsService.substituirMotorista(id, dto, actor, requestMeta(req));
  }

  @Patch(":id/substituir-veiculo")
  @Roles(...MANAGE_ROLES)
  substituirVeiculo(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: SubstituirVeiculoDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.tripsService.substituirVeiculo(id, dto, actor, requestMeta(req));
  }

  @Patch(":id/substituir-monitor")
  @Roles(...MANAGE_ROLES)
  substituirMonitor(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: SubstituirMonitorDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.tripsService.substituirMonitor(id, dto, actor, requestMeta(req));
  }

  // --- Posições GPS (GPS-02/03/06) ---

  @Post(":id/positions")
  @Roles(Role.ADMIN_ROTTA, Role.EMPRESA, Role.GESTOR, Role.MOTORISTA)
  ingestPosition(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: IngestPositionDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.tripsService.ingestPosition(id, dto, actor);
  }

  @Post(":id/positions/batch")
  @Roles(Role.ADMIN_ROTTA, Role.EMPRESA, Role.GESTOR, Role.MOTORISTA)
  ingestPositionsBatch(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: IngestPositionsBatchDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.tripsService.ingestPositionsBatch(id, dto, actor);
  }

  @Get(":id/positions")
  @Roles(...OPERATE_ROLES)
  listPositions(@Param("id", ParseUUIDPipe) id: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.tripsService.listPositions(id, actor);
  }

  // --- Checklist de embarque/desembarque (EMB-01/05 + DESEMB-01/03) ---

  @Post(":id/student-events")
  @Roles(Role.ADMIN_ROTTA, Role.EMPRESA, Role.GESTOR, Role.MOTORISTA, Role.MONITOR)
  addStudentEvent(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: CreateTripStudentEventDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.tripsService.addStudentEvent(id, dto, actor);
  }

  @Get(":id/student-events")
  @Roles(...OPERATE_ROLES)
  listStudentEvents(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.tripsService.listStudentEvents(id, actor);
  }

  // --- Recálculo de ETA por ausência de aluno (tarefa #99) ---

  @Get(":id/proximas-etas")
  @Roles(...OPERATE_ROLES)
  recalcularProximasEtas(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.tripsService.recalcularProximasEtas(id, actor);
  }
}
