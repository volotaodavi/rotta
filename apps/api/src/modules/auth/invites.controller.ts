import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Throttle, ThrottlerGuard } from "@nestjs/throttler";


import { type AuthRequestMeta } from "./auth.service";
import { CreateInviteDto } from "./dto/create-invite.dto";
import { RedeemInviteDto } from "./dto/redeem-invite.dto";
import { InvitesService } from "./invites.service";

import type { Request } from "express";

import { CurrentUser, type AuthenticatedUser } from "@/common/decorators/current-user.decorator";
import { Public } from "@/common/decorators/public.decorator";
import { Roles } from "@/common/decorators/roles.decorator";
import { Role } from "@/shared/enums";

function requestMeta(req: Request): AuthRequestMeta {
  return { ip: req.ip, userAgent: req.headers["user-agent"] };
}

/**
 * Convites de papel (Dossiê 15, briefing "Convite de Motoristas") — o
 * candidato "nunca criará uma empresa, a empresa já existirá": gerar um
 * convite é escopo de uma empresa já existente; resgatar é público
 * (candidato ainda não tem conta).
 */
@ApiTags("invites")
@Controller()
export class InvitesController {
  constructor(private readonly invitesService: InvitesService) {}

  @ApiBearerAuth()
  @Post("companies/:companyId/invites")
  @Roles(Role.ADMIN_ROTTA, Role.EMPRESA, Role.GESTOR)
  createInvite(
    @Param("companyId", ParseUUIDPipe) companyId: string,
    @Body() dto: CreateInviteDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    this.assertCanManageCompany(companyId, actor);
    return this.invitesService.createInvite(companyId, dto, actor.sub);
  }

  @ApiBearerAuth()
  @Get("companies/:companyId/invites")
  @Roles(Role.ADMIN_ROTTA, Role.EMPRESA, Role.GESTOR)
  listInvites(
    @Param("companyId", ParseUUIDPipe) companyId: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    this.assertCanManageCompany(companyId, actor);
    return this.invitesService.listActive(companyId);
  }

  @ApiBearerAuth()
  @Delete("companies/:companyId/invites/:inviteId")
  @Roles(Role.ADMIN_ROTTA, Role.EMPRESA, Role.GESTOR)
  @HttpCode(HttpStatus.NO_CONTENT)
  async revokeInvite(
    @Param("companyId", ParseUUIDPipe) companyId: string,
    @Param("inviteId", ParseUUIDPipe) inviteId: string,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<void> {
    this.assertCanManageCompany(companyId, actor);
    await this.invitesService.revoke(inviteId);
  }

  @Public()
  @Get("invites/:codigo/preview")
  previewInvite(@Param("codigo") codigo: string) {
    return this.invitesService.previewByCodigo(codigo);
  }

  @Public()
  @Post("invites/redeem")
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  redeemInvite(@Body() dto: RedeemInviteDto, @Req() req: Request) {
    return this.invitesService.redeem(dto, requestMeta(req));
  }

  /** Mesmo princípio de não-enumeração de `CompaniesService` — 404, nunca 403. */
  private assertCanManageCompany(companyId: string, actor: AuthenticatedUser): void {
    if (actor.role !== Role.ADMIN_ROTTA && actor.tenantId !== companyId) {
      throw new NotFoundException("Empresa não encontrada.");
    }
  }
}
