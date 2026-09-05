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

import { CreateTransportRequestDto } from "./dto/create-transport-request.dto";
import { ListTransportRequestsQueryDto } from "./dto/list-transport-requests-query.dto";
import { RecusarTransportRequestDto } from "./dto/recusar-transport-request.dto";
import { TransportRequestsService, type RequestMeta } from "./transport-requests.service";

import type { Request } from "express";

import { CurrentUser, type AuthenticatedUser } from "@/common/decorators/current-user.decorator";
import { Roles } from "@/common/decorators/roles.decorator";
import { Role } from "@/shared/enums";

const EMPRESA_ROLES = [Role.EMPRESA, Role.GESTOR] as const;
const READ_ROLES = [Role.RESPONSAVEL, Role.EMPRESA, Role.GESTOR, Role.ADMIN_ROTTA] as const;

function requestMeta(req: Request): RequestMeta {
  return { ip: req.ip, userAgent: req.headers["user-agent"] };
}

/**
 * Solicitação de transporte (briefing "Marketplace" §"SOLICITAR
 * TRANSPORTE"/"SOLICITAÇÃO"). Criação: exclusiva do Responsável.
 * Transições de status (`em-analise`/`aprovar`/`recusar`): exclusivas
 * da Empresa/Gestor dona da solicitação.
 */
@ApiTags("marketplace")
@ApiBearerAuth()
@Controller("marketplace/transport-requests")
export class TransportRequestsController {
  constructor(private readonly transportRequestsService: TransportRequestsService) {}

  @Post()
  @Roles(Role.RESPONSAVEL)
  create(
    @Body() dto: CreateTransportRequestDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.transportRequestsService.create(dto, actor, requestMeta(req));
  }

  @Get()
  @Roles(...READ_ROLES)
  list(@Query() query: ListTransportRequestsQueryDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.transportRequestsService.list(query, actor);
  }

  @Get(":id")
  @Roles(...READ_ROLES)
  findById(@Param("id", ParseUUIDPipe) id: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.transportRequestsService.findByIdOrThrow(id, actor);
  }

  @Patch(":id/em-analise")
  @Roles(...EMPRESA_ROLES)
  marcarEmAnalise(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.transportRequestsService.marcarEmAnalise(id, actor, requestMeta(req));
  }

  @Patch(":id/aprovar")
  @Roles(...EMPRESA_ROLES)
  aprovar(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.transportRequestsService.aprovar(id, actor, requestMeta(req));
  }

  @Patch(":id/recusar")
  @Roles(...EMPRESA_ROLES)
  recusar(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: RecusarTransportRequestDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.transportRequestsService.recusar(id, dto, actor, requestMeta(req));
  }
}
