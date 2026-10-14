import { BadRequestException, Controller, Get, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";

import { RecebimentoService, type SituacaoDoRecebimento } from "./recebimento.service";

import { CurrentUser, type AuthenticatedUser } from "@/common/decorators/current-user.decorator";
import { Roles } from "@/common/decorators/roles.decorator";
import { RolesGuard } from "@/common/guards/roles.guard";
import { Role } from "@/shared/enums";

/**
 * Recebimento direto da transportadora, consumido pelo APP.
 *
 * Decisão do fundador em 14/10/2026: "será totalmente voltado para o
 * app nativo, nada de web". Por isso não existe tela equivalente em
 * `apps/web`, e estas duas rotas são a superfície inteira.
 *
 * A transportadora nunca vem do cliente: sai do `tenantId` do token.
 * Uma transportadora não pode habilitar recebimento para outra, e
 * deixar esse id virar parâmetro de rota seria abrir exatamente essa
 * porta.
 */
@ApiTags("Recebimento")
@ApiBearerAuth()
@Controller("recebimento")
@UseGuards(RolesGuard)
@Roles(Role.EMPRESA, Role.GESTOR)
export class RecebimentoController {
  constructor(private readonly recebimento: RecebimentoService) {}

  @Get()
  @ApiOperation({
    summary: "Situação do recebimento direto desta transportadora.",
    description:
      "Nunca falha por indisponibilidade da Asaas: sem resposta, devolve o último estado conhecido.",
  })
  consultar(@CurrentUser() user: AuthenticatedUser): Promise<SituacaoDoRecebimento> {
    return this.recebimento.consultar(exigirTransportadora(user));
  }

  @Post()
  @ApiOperation({
    summary: "Habilita o recebimento direto, criando a subconta na Asaas.",
    description:
      "Idempotente: chamar de novo devolve a situação atual sem criar outra subconta. Subconta duplicada não tem desfazer.",
  })
  habilitar(@CurrentUser() user: AuthenticatedUser): Promise<SituacaoDoRecebimento> {
    return this.recebimento.habilitar(exigirTransportadora(user));
  }
}

/**
 * `tenantId` é nulo para papéis que não pertencem a uma transportadora
 * (Responsável, Admin Rotta, Escola). O `RolesGuard` já barra esses
 * papéis aqui, então isto é defesa em profundidade: se um dia alguém
 * afrouxar os papéis da rota, a falha vira um 400 claro em vez de um
 * `undefined` viajando até o banco.
 */
function exigirTransportadora(user: AuthenticatedUser): string {
  if (!user.tenantId) {
    throw new BadRequestException("Esta conta não está vinculada a uma transportadora.");
  }
  return user.tenantId;
}
