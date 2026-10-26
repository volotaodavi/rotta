import { Controller, Get, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiQuery, ApiTags } from "@nestjs/swagger";

import { DispatchService } from "./dispatch.service";
import { PainelDoDespachanteResponseDto } from "./dto/painel-do-despachante-response.dto";

import { CurrentUser, type AuthenticatedUser } from "@/common/decorators/current-user.decorator";
import { Roles } from "@/common/decorators/roles.decorator";
import { Role } from "@/shared/enums";

/**
 * Painel Geral do Despachante.
 *
 * Um endpoint só, de leitura, que devolve a tela inteira. A alternativa
 * (seis endpoints, um por bloco) foi descartada por aritmética: o
 * painel recarrega a cada poucos segundos durante toda a operação, e
 * seis chamadas por ciclo multiplicariam por seis a carga para
 * entregar a mesma tela.
 *
 * Quem ESCREVE continua onde sempre esteve. Trocar o ônibus da viagem é
 * `PATCH /trips/:id/veiculo`, que notifica as famílias; escalar é
 * `POST /route-assignments`. Nenhuma das duas mudou de lugar por causa
 * deste painel, e isso é deliberado: um endpoint de leitura que também
 * escrevesse não poderia ser recarregado sem pensar.
 */
@ApiTags("dispatch")
@ApiBearerAuth()
@Controller("dispatch")
export class DispatchController {
  constructor(private readonly dispatchService: DispatchService) {}

  @Get("painel")
  @Roles(Role.ADMIN_ROTTA, Role.EMPRESA, Role.GESTOR)
  @ApiOperation({
    summary: "O estado da operação de hoje: indicadores, mapa, rotas, alertas, escala e eventos.",
  })
  @ApiQuery({
    name: "companyId",
    required: false,
    description:
      "Só para Admin Rotta, que não tem tenant. Empresa e gestor sempre recebem o painel da própria transportadora, e um valor aqui é ignorado.",
  })
  @ApiOkResponse({ type: PainelDoDespachanteResponseDto })
  getPainel(
    @CurrentUser() actor: AuthenticatedUser,
    @Query("companyId") companyId?: string,
  ): Promise<PainelDoDespachanteResponseDto> {
    return this.dispatchService.carregarPainel(actor, companyId);
  }
}
