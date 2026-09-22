import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiOkResponse, ApiTags } from "@nestjs/swagger";

import { AlunoDoDiaResponseDto } from "./dto/aluno-do-dia-response.dto";
import { ContaDaEscolaResponseDto } from "./dto/conta-da-escola-response.dto";
import { CriarContaDaEscolaDto } from "./dto/criar-conta-da-escola.dto";
import { DefinirStatusDaContaDto } from "./dto/definir-status-da-conta.dto";
import { SchoolPortalService } from "./school-portal.service";

import { CurrentUser, type AuthenticatedUser } from "@/common/decorators/current-user.decorator";
import { Roles } from "@/common/decorators/roles.decorator";
import { Role } from "@/shared/enums";

/**
 * Portal da Escola (22/09/2026) — somente leitura, exclusivo de
 * `Role.ESCOLA`.
 *
 * Repare que NENHUMA rota aqui recebe `schoolId`. É deliberado: o
 * escopo vem do token (ver `SchoolPortalService`). Uma rota que
 * aceitasse a escola por parâmetro entregaria a lista de crianças de
 * qualquer escola a quem trocasse o UUID na URL.
 */
@ApiTags("school-portal")
@ApiBearerAuth()
@Controller("school-portal")
export class SchoolPortalController {
  constructor(private readonly schoolPortalService: SchoolPortalService) {}

  /**
   * Quem vai/foi de ônibus hoje nesta escola — a tela de controle de
   * saída.
   */
  @Get("alunos-hoje")
  @Roles(Role.ESCOLA)
  @ApiOkResponse({ type: [AlunoDoDiaResponseDto] })
  listarAlunosDoDia(@CurrentUser() actor: AuthenticatedUser) {
    return this.schoolPortalService.listarAlunosDoDia(actor);
  }

  // --- Contas do portal -------------------------------------------------
  //
  // Estas três SÃO acessíveis ao Admin da Rotta, ao contrário de
  // `alunos-hoje`: é ele quem abre o acesso inicial de cada escola do
  // município (fluxo público, 22/09/2026). O `escolaId` no corpo/query
  // só é lido quando o ator é Admin — para a conta de escola ele é
  // ignorado e a escola vem do token, exatamente como acima.

  @Post("contas")
  @Roles(Role.ADMIN_ROTTA, Role.ESCOLA)
  @ApiOkResponse({ type: ContaDaEscolaResponseDto })
  criarConta(@Body() dto: CriarContaDaEscolaDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.schoolPortalService.criarConta(dto, actor);
  }

  @Get("contas")
  @Roles(Role.ADMIN_ROTTA, Role.ESCOLA)
  @ApiOkResponse({ type: [ContaDaEscolaResponseDto] })
  listarContas(@CurrentUser() actor: AuthenticatedUser, @Query("escolaId") escolaId?: string) {
    return this.schoolPortalService.listarContas(actor, escolaId);
  }

  @Patch("contas/:id/status")
  @Roles(Role.ADMIN_ROTTA, Role.ESCOLA)
  @ApiOkResponse({ type: ContaDaEscolaResponseDto })
  definirStatusDaConta(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: DefinirStatusDaContaDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.schoolPortalService.definirStatusDaConta(id, dto.ativo, actor);
  }
}
