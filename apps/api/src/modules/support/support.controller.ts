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

import { CreateSupportMessageDto } from "./dto/create-support-message.dto";
import { CreateSupportTicketDto } from "./dto/create-support-ticket.dto";
import { ListSupportTicketsQueryDto } from "./dto/list-support-tickets-query.dto";
import { SupportService, type RequestMeta } from "./support.service";

import type { Request } from "express";

import { CurrentUser, type AuthenticatedUser } from "@/common/decorators/current-user.decorator";
import { Roles } from "@/common/decorators/roles.decorator";
import { Role } from "@/shared/enums";

function requestMeta(req: Request): RequestMeta {
  return { ip: req.ip, userAgent: req.headers["user-agent"] };
}

/** Abrir/listar/responder: Empresa/Gestor (próprio tenant, `SUP-01`) + Admin Rotta (cross-tenant, `ADM-04`). */
const SUPPORT_ROLES = [Role.EMPRESA, Role.GESTOR, Role.ADMIN_ROTTA] as const;

/**
 * API REST do módulo Suporte (Dossiê 20, `SUP-01` a `SUP-03`/`ADM-04`;
 * Dossiê 29). Abrir um chamado é exclusivo de Empresa/Gestor (`SUP-01`
 * — Motorista/Monitor/Responsável não têm acesso a este canal no MVP);
 * responder/listar/encerrar é comum às duas pontas.
 */
@ApiTags("support")
@ApiBearerAuth()
@Controller("support/tickets")
export class SupportController {
  constructor(private readonly supportService: SupportService) {}

  @Post()
  @Roles(Role.EMPRESA, Role.GESTOR)
  create(
    @Body() dto: CreateSupportTicketDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.supportService.createTicket(dto, actor, requestMeta(req));
  }

  @Get()
  @Roles(...SUPPORT_ROLES)
  list(@Query() query: ListSupportTicketsQueryDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.supportService.listTickets(query, actor);
  }

  @Get(":id")
  @Roles(...SUPPORT_ROLES)
  detail(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Query("companyId") companyId?: string,
  ) {
    return this.supportService.getTicketDetail(id, actor, companyId);
  }

  @Post(":id/messages")
  @Roles(...SUPPORT_ROLES)
  addMessage(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: CreateSupportMessageDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
    @Query("companyId") companyId?: string,
  ) {
    return this.supportService.addMessage(id, dto, actor, requestMeta(req), companyId);
  }

  @Patch(":id/close")
  @Roles(...SUPPORT_ROLES)
  close(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
    @Query("companyId") companyId?: string,
  ) {
    return this.supportService.closeTicket(id, actor, requestMeta(req), companyId);
  }
}
