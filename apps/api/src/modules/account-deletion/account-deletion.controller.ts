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

import {
  AccountDeletionService,
  type RecorteDeContas,
  type RequestMeta,
} from "./account-deletion.service";

import type { Request } from "express";

import { CurrentUser, type AuthenticatedUser } from "@/common/decorators/current-user.decorator";
import { Roles } from "@/common/decorators/roles.decorator";
import { Role } from "@/shared/enums";

function requestMeta(req: Request): RequestMeta {
  return { ip: req.ip, userAgent: req.headers["user-agent"] };
}

/**
 * Recorte desconhecido é ignorado (lista inteira), nunca erro 400: a
 * tela é a única cliente, e um nome errado aqui não é um ataque, é um
 * link antigo.
 */
const RECORTES_VALIDOS = new Set<RecorteDeContas>([
  "com-pendencia",
  "sem-transportadora",
  "responsavel-sem-aluno",
  "identidade-pendente",
  "desativadas",
]);

/** Teto de 100 por página: busca de admin, não exportação. */
function limitePedido(limit: number | undefined): number {
  return limit && limit > 0 ? Math.min(limit, 100) : 50;
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
    @Query("recorte") recorte?: string,
    @Query("limit", new ParseIntPipe({ optional: true })) limit?: number,
  ) {
    return this.service.listarContas({
      q,
      recorte: RECORTES_VALIDOS.has(recorte as RecorteDeContas)
        ? (recorte as RecorteDeContas)
        : undefined,
      limit: limitePedido(limit),
    });
  }

  /**
   * Pré-cadastros que nunca viraram conta — a lista que não existia em
   * tela nenhuma do painel (pedido do usuário 02/10/2026: "mostre os
   * cadastros não contemplados também, pq aí vou saber quais são as
   * questões faltantes").
   */
  @Get("pre-cadastros")
  listarPreCadastros(
    @Query("q") q?: string,
    @Query("limit", new ParseIntPipe({ optional: true })) limit?: number,
  ) {
    return this.service.listarPreCadastros({ q, limit: limitePedido(limit) });
  }

  @Delete("pre-cadastros/:id")
  excluirPreCadastro(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.service.excluirPreCadastro(id, actor.sub, requestMeta(req));
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
