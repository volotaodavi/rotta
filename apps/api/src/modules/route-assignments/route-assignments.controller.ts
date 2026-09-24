import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOkResponse, ApiTags } from "@nestjs/swagger";

import { DefinirEscalaDto } from "./dto/definir-escala.dto";
import { EscalaResponseDto } from "./dto/escala-response.dto";
import { RouteAssignmentsService } from "./route-assignments.service";

import { CurrentUser, type AuthenticatedUser } from "@/common/decorators/current-user.decorator";
import { Roles } from "@/common/decorators/roles.decorator";
import { Role } from "@/shared/enums";

/** Quem monta a escala: o despachante, que na Rotta é Empresa/Gestor. */
const DESPACHO_ROLES = [Role.ADMIN_ROTTA, Role.EMPRESA, Role.GESTOR] as const;
/** Quem CONSULTA a própria escala: motorista e monitor. */
const OPERACAO_ROLES = [...DESPACHO_ROLES, Role.MOTORISTA, Role.MONITOR] as const;

/**
 * Escala do dia (24/09/2026) — qual ônibus, com qual motorista, faz
 * cada rota em cada data.
 */
@ApiTags("escalas")
@ApiBearerAuth()
@Controller("escalas")
export class RouteAssignmentsController {
  constructor(private readonly service: RouteAssignmentsService) {}

  @Post()
  @Roles(...DESPACHO_ROLES)
  @ApiOkResponse({ type: EscalaResponseDto })
  definir(@Body() dto: DefinirEscalaDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.service.definir(dto, actor);
  }

  /**
   * Rota literal ANTES de `:id` — mesma precaução do resto da API, pra
   * nunca colidir com o parâmetro coringa.
   */
  @Get("minhas")
  @Roles(...OPERACAO_ROLES)
  @ApiOkResponse({ type: [EscalaResponseDto] })
  minhasEscalas(@CurrentUser() actor: AuthenticatedUser) {
    return this.service.minhasEscalas(actor);
  }

  @Get()
  @Roles(...DESPACHO_ROLES)
  @ApiOkResponse({ type: [EscalaResponseDto] })
  listarPorDia(@Query("data") data: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.service.listarPorDia(data, actor);
  }

  @Delete(":id")
  @Roles(...DESPACHO_ROLES)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remover(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<void> {
    await this.service.remover(id, actor);
  }
}
