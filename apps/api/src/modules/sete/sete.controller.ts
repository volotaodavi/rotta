import { Controller, Get, Query, Res } from "@nestjs/common";
import { ApiBearerAuth, ApiOkResponse, ApiTags } from "@nestjs/swagger";

import { EscopoSeteQueryDto } from "./dto/escopo-sete-query.dto";
import { ExportarSeteQueryDto } from "./dto/exportar-sete-query.dto";
import { SeteService } from "./sete.service";

import type { Response } from "express";

import { CurrentUser, type AuthenticatedUser } from "@/common/decorators/current-user.decorator";
import { Roles } from "@/common/decorators/roles.decorator";
import { Role } from "@/shared/enums";

/**
 * Integração com o SETE (FNDE) — `docs/52-integracao-sete.md`.
 *
 * Exclusivo de quem responde pelo contrato com a prefeitura. O perfil de
 * escola NÃO entra: ele enxerga alunos de mais de uma transportadora, e
 * dar-lhe exportação abriria uma porta de saída de dado de criança num
 * escopo que hoje é só de leitura (RN-SETE-01, decisão de 10/11/2026).
 */
@ApiTags("sete")
@ApiBearerAuth()
@Controller("sete")
@Roles(Role.EMPRESA, Role.GESTOR, Role.ADMIN_ROTTA)
export class SeteController {
  constructor(private readonly seteService: SeteService) {}

  /** O que falta para o pacote ficar completo. */
  @Get("pendencias")
  @ApiOkResponse({ description: "Lista de pendências, sem nenhum dado sensível." })
  listarPendencias(@CurrentUser() actor: AuthenticatedUser, @Query() query: EscopoSeteQueryDto) {
    return this.seteService.listarPendencias(actor, query.companyId);
  }

  /** Município da área de atuação, para a tela sugerir o código IBGE. */
  @Get("municipio")
  sugerirMunicipio(@CurrentUser() actor: AuthenticatedUser, @Query() query: EscopoSeteQueryDto) {
    return this.seteService.sugerirMunicipio(actor, query.companyId);
  }

  /**
   * O pacote em `.zip`.
   *
   * `@Res()` sem `passthrough`, mesmo motivo de `VehiclesController.
   * export`: o binário não pode passar pelo `TransformResponseInterceptor`.
   */
  @Get("exportacao")
  async exportar(
    @CurrentUser() actor: AuthenticatedUser,
    @Query() query: ExportarSeteQueryDto,
    @Res() res: Response,
  ): Promise<void> {
    const { buffer, filename } = await this.seteService.exportarZip(actor, {
      formato: query.formato ?? "json",
      codigoIbge: query.codigoIbge,
      companyId: query.companyId,
    });

    res
      .status(200)
      .set({
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${filename}"`,
      })
      .send(buffer);
  }
}
