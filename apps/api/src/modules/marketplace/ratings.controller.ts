import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Req } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";

import { CreateRatingDto } from "./dto/create-rating.dto";
import { RatingsService, type RequestMeta } from "./ratings.service";

import type { Request } from "express";

import { CurrentUser, type AuthenticatedUser } from "@/common/decorators/current-user.decorator";
import { Roles } from "@/common/decorators/roles.decorator";
import { Role } from "@/shared/enums";

const READ_ROLES = [Role.RESPONSAVEL, Role.EMPRESA, Role.GESTOR, Role.ADMIN_ROTTA] as const;

function requestMeta(req: Request): RequestMeta {
  return { ip: req.ip, userAgent: req.headers["user-agent"] };
}

/** Avaliações pós-transporte (briefing "Marketplace" §"AVALIAÇÕES") — criação exclusiva do Responsável dono do contrato. */
@ApiTags("marketplace")
@ApiBearerAuth()
@Controller("marketplace/contracts/:contractId/ratings")
export class RatingsController {
  constructor(private readonly ratingsService: RatingsService) {}

  @Post()
  @Roles(Role.RESPONSAVEL)
  create(
    @Param("contractId", ParseUUIDPipe) contractId: string,
    @Body() dto: CreateRatingDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.ratingsService.create(contractId, dto, actor, requestMeta(req));
  }

  @Get()
  @Roles(...READ_ROLES)
  listByContract(
    @Param("contractId", ParseUUIDPipe) contractId: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.ratingsService.listByContract(contractId, actor);
  }
}
