import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";

import { BackofficeService, type RequestMeta } from "./backoffice.service";
import { AccessAsSupportDto } from "./dto/access-as-support.dto";

import type { Request } from "express";

import { CurrentUser, type AuthenticatedUser } from "@/common/decorators/current-user.decorator";
import { Roles } from "@/common/decorators/roles.decorator";
import { Role } from "@/shared/enums";

function requestMeta(req: Request): RequestMeta {
  return { ip: req.ip, userAgent: req.headers["user-agent"] };
}

/**
 * API REST do Backoffice (Prompt 21 / Dossiê 29) — tela inicial do
 * Admin Rotta (Dossiê 11 §6.1). Exclusivo de `Role.ADMIN_ROTTA` em
 * TODOS os endpoints (`ADM-01`: "exclusivo de Admin Rotta").
 */
@ApiTags("backoffice")
@ApiBearerAuth()
@Controller("backoffice")
@Roles(Role.ADMIN_ROTTA)
export class BackofficeController {
  constructor(private readonly backofficeService: BackofficeService) {}

  @Get("dashboard")
  getDashboard() {
    return this.backofficeService.getDashboard();
  }

  @Get("approvals")
  listApprovals(@Query("limit", new ParseIntPipe({ optional: true })) limit?: number) {
    return this.backofficeService.listApprovals(limit && limit > 0 ? Math.min(limit, 100) : 20);
  }

  @Post("companies/:id/access-as-support")
  accessAsSupport(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: AccessAsSupportDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.backofficeService.accessAsSupport(id, dto, actor, requestMeta(req));
  }
}
