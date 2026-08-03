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


import { ContractsService, type RequestMeta } from "./contracts.service";
import { CreateContractDto } from "./dto/create-contract.dto";
import { ListContractsQueryDto } from "./dto/list-contracts-query.dto";

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
 * Contrato (briefing "Marketplace" §"CONTRATO"). Geração: exclusiva da
 * Empresa/Gestor, a partir de uma `TransportRequest` Aprovada. Assinatura
 * tem dois endpoints independentes — cada lado só assina o seu.
 */
@ApiTags("marketplace")
@ApiBearerAuth()
@Controller("marketplace")
export class ContractsController {
  constructor(private readonly contractsService: ContractsService) {}

  @Post("transport-requests/:transportRequestId/contract")
  @Roles(...EMPRESA_ROLES)
  gerarContrato(
    @Param("transportRequestId", ParseUUIDPipe) transportRequestId: string,
    @Body() dto: CreateContractDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.contractsService.gerarContrato(transportRequestId, dto, actor, requestMeta(req));
  }

  @Get("contracts")
  @Roles(...READ_ROLES)
  list(@Query() query: ListContractsQueryDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.contractsService.list(query, actor);
  }

  @Get("contracts/:id")
  @Roles(...READ_ROLES)
  findById(@Param("id", ParseUUIDPipe) id: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.contractsService.findByIdOrThrow(id, actor);
  }

  @Patch("contracts/:id/assinar-responsavel")
  @Roles(Role.RESPONSAVEL)
  assinarComoResponsavel(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.contractsService.assinarComoResponsavel(id, actor, requestMeta(req));
  }

  @Patch("contracts/:id/assinar-empresa")
  @Roles(...EMPRESA_ROLES)
  assinarComoEmpresa(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.contractsService.assinarComoEmpresa(id, actor, requestMeta(req));
  }
}
