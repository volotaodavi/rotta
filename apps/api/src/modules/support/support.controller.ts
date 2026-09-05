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

import { AdminAreas } from "@/common/decorators/admin-areas.decorator";
import { CurrentUser, type AuthenticatedUser } from "@/common/decorators/current-user.decorator";
import { Roles } from "@/common/decorators/roles.decorator";
import { SkipTrialGuard } from "@/common/decorators/skip-trial-guard.decorator";
import { AdminArea, Role } from "@/shared/enums";

function requestMeta(req: Request): RequestMeta {
  return { ip: req.ip, userAgent: req.headers["user-agent"] };
}

/**
 * Abrir/listar/responder: Empresa/Gestor (próprio tenant, `SUP-01`) +
 * Admin Rotta (cross-tenant, `ADM-04`) + Responsável (Epic B — só os
 * próprios chamados, nunca o tenant inteiro, ver
 * `SupportService.resolveTicketScope`).
 */
const SUPPORT_ROLES = [Role.EMPRESA, Role.GESTOR, Role.ADMIN_ROTTA, Role.RESPONSAVEL] as const;

/** Arquivar/desarquivar (pedido do usuário 02/09/2026) — nunca pelo Responsável, ver `SupportService.setArquivado`. */
const ARCHIVE_ROLES = [Role.EMPRESA, Role.GESTOR, Role.ADMIN_ROTTA] as const;

/**
 * API REST do módulo Suporte (Dossiê 20, `SUP-01` a `SUP-03`/`ADM-04`;
 * Dossiê 29). Abrir um chamado: Empresa/Gestor (próprio tenant) e
 * Responsável (Epic B — Motorista/Monitor seguem fora de escopo);
 * responder/listar/encerrar é comum a todas as partes envolvidas.
 */
@ApiTags("support")
@ApiBearerAuth()
@Controller("support/tickets")
@SkipTrialGuard()
// Admin Rotta com adminRottaPapel === SUPORTE só vê esta área (pedido
// do usuário 03/09/2026) — nível de classe, seguro mesmo pro `create`
// abaixo (nunca lista ADMIN_ROTTA em `@Roles`, então `AdminAreaGuard`
// nem chega a rodar pra ele nessa rota).
@AdminAreas(AdminArea.SUPORTE)
export class SupportController {
  constructor(private readonly supportService: SupportService) {}

  @Post()
  @Roles(Role.EMPRESA, Role.GESTOR, Role.RESPONSAVEL)
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

  @Patch(":id/archive")
  @Roles(...ARCHIVE_ROLES)
  archive(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
    @Query("companyId") companyId?: string,
  ) {
    return this.supportService.archiveTicket(id, actor, requestMeta(req), companyId);
  }

  @Patch(":id/unarchive")
  @Roles(...ARCHIVE_ROLES)
  unarchive(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
    @Query("companyId") companyId?: string,
  ) {
    return this.supportService.unarchiveTicket(id, actor, requestMeta(req), companyId);
  }
}
