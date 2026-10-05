import { Body, Controller, Get, Headers, Post, Query, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";

import { ClientErrorsService } from "./client-errors.service";
import { DiretoriaReadGuard } from "./diretoria-read.guard";
import { CreateClientErrorReportDto } from "./dto/create-client-error-report.dto";
import { ListClientErrorReportsQueryDto } from "./dto/list-client-error-reports-query.dto";

import type { Request } from "express";

import { Public } from "@/common/decorators/public.decorator";
import { Roles } from "@/common/decorators/roles.decorator";
import { Role } from "@/shared/enums";

/**
 * `POST /client-errors` — ver a nota completa em `ClientErrorReport`
 * (schema.prisma) e `ClientErrorsService`. Público de propósito
 * (`@Public()`), mas coberto pelo rate limiting global registrado em
 * `app.module.ts` porque é escrita sem autenticação obrigatória — sem
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

  /**
   * Plantão da diretoria de agentes: os erros recentes agrupados, lidos
   * por um turno agendado que não tem conta de admin (autorizado pelo
   * fundador em 05/10/2026). `@Public()` tira o JWT do caminho e quem
   * autentica é o `DiretoriaReadGuard`, pelo segredo de cabeçalho.
   */
  @Public()
  @UseGuards(DiretoriaReadGuard)
  @Get("plantao")
  plantao(@Query("horas") horas?: string, @Query("limite") limite?: string) {
    return this.service.plantao(
      horas ? Math.min(Math.max(Number(horas), 1), 720) : 72,
      limite ? Math.min(Math.max(Number(limite), 1), 50) : 20,
    );
  }
}
