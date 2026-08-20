import { Body, Controller, Get, Headers, Post, Query, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { ThrottlerGuard } from "@nestjs/throttler";

import { ClientErrorsService } from "./client-errors.service";
import { CreateClientErrorReportDto } from "./dto/create-client-error-report.dto";
import { ListClientErrorReportsQueryDto } from "./dto/list-client-error-reports-query.dto";

import type { Request } from "express";

import { Public } from "@/common/decorators/public.decorator";
import { Roles } from "@/common/decorators/roles.decorator";
import { Role } from "@/shared/enums";

/**
 * `POST /client-errors` — ver a nota completa em `ClientErrorReport`
 * (schema.prisma) e `ClientErrorsService`. Público de propósito
 * (`@Public()`), com `ThrottlerGuard` (mesmo padrão documentado em
 * `AuthModule`) porque é escrita sem autenticação obrigatória — sem
 * limite de taxa, viraria um jeito barato de encher a tabela.
 *
 * `GET /client-errors` — só Admin Rotta: painel de diagnóstico
 * cross-tenant (nenhuma Empresa/Gestor precisa ou deveria ver erro de
 * OUTRA empresa), fecha o ciclo desta Frente — a mensagem REAL de um
 * erro de "Server Components render" (redigida pelo Next.js pro
 * navegador em produção) agora fica consultável aqui, sem depender de
 * ninguém ir atrás de log nenhum.
 */
@ApiTags("client-errors")
@Controller("client-errors")
export class ClientErrorsController {
  constructor(private readonly service: ClientErrorsService) {}

  @Public()
  @UseGuards(ThrottlerGuard)
  @Post()
  create(
    @Body() dto: CreateClientErrorReportDto,
    @Req() req: Request,
    @Headers("authorization") authorizationHeader?: string,
  ) {
    return this.service.create(dto, {
      authorizationHeader,
      userAgent: req.headers["user-agent"],
    });
  }

  @ApiBearerAuth()
  @Roles(Role.ADMIN_ROTTA)
  @Get()
  list(@Query() query: ListClientErrorReportsQueryDto) {
    return this.service.list(query);
  }
}
