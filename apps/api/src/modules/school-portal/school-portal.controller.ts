import { Controller, Get } from "@nestjs/common";
import { ApiBearerAuth, ApiOkResponse, ApiTags } from "@nestjs/swagger";

import { AlunoDoDiaResponseDto } from "./dto/aluno-do-dia-response.dto";
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
}
