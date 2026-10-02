import {
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Query,
  Req,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";

import { AccountDeletionService, type RequestMeta } from "./account-deletion.service";

import type { UserStatus } from "@prisma/client";
import type { Request } from "express";

import { CurrentUser, type AuthenticatedUser } from "@/common/decorators/current-user.decorator";
import { Roles } from "@/common/decorators/roles.decorator";
import { Role } from "@/shared/enums";

function requestMeta(req: Request): RequestMeta {
  return { ip: req.ip, userAgent: req.headers["user-agent"] };
}

/**
 * Exclusão definitiva de contas e transportadoras — exclusivo de
 * `Role.ADMIN_ROTTA` (`ADM-01`), igual ao resto do Backoffice.
 *
 * Cada exclusão tem um `preview` próprio, e a tela SEMPRE o chama antes
 * do botão: é uma operação sem volta, então o admin precisa ver o que
 * vai embora (e o que impede) antes de confirmar, não depois.
 */
@ApiTags("account-deletion")
@ApiBearerAuth()
@Controller("account-deletion")
@Roles(Role.ADMIN_ROTTA)
export class AccountDeletionController {
  constructor(private readonly service: AccountDeletionService) {}

  @Get("users")
  listarContas(
    @Query("q") q?: string,
    @Query("semEmpresa") semEmpresa?: string,
    @Query("status") status?: string,
    @Query("limit", new ParseIntPipe({ optional: true })) limit?: number,
  ) {
    return this.service.listarContas({
      q,
      semEmpresa: semEmpresa === "true",
      status: status ? (status as UserStatus) : undefined,
      limit: limit && limit > 0 ? Math.min(limit, 100) : 50,
    });
  }

  @Get("users/:id/preview")
  previewConta(@Param("id", ParseUUIDPipe) id: string) {
    return this.service.previewConta(id);
  }

  @Delete("users/:id")
  excluirConta(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.service.excluirConta(id, actor.sub, requestMeta(req));
  }

  @Get("companies/:id/preview")
  previewEmpresa(@Param("id", ParseUUIDPipe) id: string) {
    return this.service.previewEmpresa(id);
  }

  @Delete("companies/:id")
  excluirEmpresa(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.service.excluirEmpresa(id, actor.sub, requestMeta(req));
  }
}
