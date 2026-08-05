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

import { AgendaService, type RequestMeta } from "./agenda.service";
import { CreateAgendaEventDto } from "./dto/create-agenda-event.dto";
import { ListAgendaEventsQueryDto } from "./dto/list-agenda-events-query.dto";
import { UpdateAgendaEventDto } from "./dto/update-agenda-event.dto";

import type { Request } from "express";

import { CurrentUser, type AuthenticatedUser } from "@/common/decorators/current-user.decorator";
import { Roles } from "@/common/decorators/roles.decorator";
import { Role } from "@/shared/enums";

const MANAGE_ROLES = [Role.ADMIN_ROTTA, Role.EMPRESA, Role.GESTOR] as const;
// Motorista/Monitor podem criar a própria ausência planejada (AGE-03) e
// enxergar o calendário da empresa — nunca editar/remover eventos.
const CREATE_ROLES = [...MANAGE_ROLES, Role.MOTORISTA, Role.MONITOR] as const;
const READ_ROLES = CREATE_ROLES;

function requestMeta(req: Request): RequestMeta {
  return { ip: req.ip, userAgent: req.headers["user-agent"] };
}

/**
 * API REST do módulo Agenda (Dossiê 8 §14 / EF Parte 6, AGE-01 a
 * AGE-05, tarefa #101).
 */
@ApiTags("agenda")
@ApiBearerAuth()
@Controller("agenda")
export class AgendaController {
  constructor(private readonly agendaService: AgendaService) {}

  @Post()
  @Roles(...CREATE_ROLES)
  create(
    @Body() dto: CreateAgendaEventDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.agendaService.create(dto, actor, requestMeta(req));
  }

  @Get()
  @Roles(...READ_ROLES)
  list(@Query() query: ListAgendaEventsQueryDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.agendaService.list(query, actor);
  }

  @Get(":id")
  @Roles(...READ_ROLES)
  findById(@Param("id", ParseUUIDPipe) id: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.agendaService.findByIdOrThrow(id, actor);
  }

  @Patch(":id")
  @Roles(...MANAGE_ROLES)
  update(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateAgendaEventDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.agendaService.update(id, dto, actor, requestMeta(req));
  }

  @Delete(":id")
  @Roles(...MANAGE_ROLES)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ): Promise<void> {
    await this.agendaService.remove(id, actor, requestMeta(req));
  }
}
