import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Put, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";

/* Import de VALOR, nao `import type`: o `ValidationPipe` le os
   metadados da classe em tempo de execucao, e com `import type` o DTO
   desaparece do bundle e nada e validado. */
import { ListInvoicesQueryDto } from "./dto/list-invoices-query.dto";
import { SalvarContaDeRecebimentoDto } from "./dto/salvar-conta-de-recebimento.dto";
import { FamilyBillingService } from "./family-billing.service";

import type { AuthenticatedUser } from "@/common/decorators/current-user.decorator";

import { CurrentUser } from "@/common/decorators/current-user.decorator";
import { Roles } from "@/common/decorators/roles.decorator";
import { Role } from "@/shared/enums";

/** Quem enxerga as contas a receber da transportadora. */
const TRANSPORTADOR_ROLES = [Role.EMPRESA, Role.GESTOR] as const;

/**
 * Quem enxerga a fatura pelo lado da família.
 *
 * `EMPRESA`/`GESTOR`/`ADMIN_ROTTA` entram porque atendem a família no
 * suporte ("minha fatura não aparece") e porque o caminho é o mesmo
 * dos outros endpoints por aluno — a posse é sempre resolvida por
 * `StudentsService.findByIdOrThrow`, que já sabe o que cada papel pode
 * ver.
 */
const LEITURA_POR_ALUNO = [Role.RESPONSAVEL, Role.ADMIN_ROTTA, Role.EMPRESA, Role.GESTOR] as const;

/**
 * Cobrança da família (mensalidade do transporte escolar) — o
 * Responsável paga a TRANSPORTADORA.
 *
 * Não confundir com `/billing`, que é a Rotta cobrando a transportadora
 * pela plataforma. Ver a nota de `FamilyBillingService`.
 */
@ApiTags("Cobrança da família")
@ApiBearerAuth()
@Controller("family-billing")
export class FamilyBillingController {
  constructor(private readonly familyBillingService: FamilyBillingService) {}

  // --- Responsável ---

  @ApiOperation({
    summary: "Quanto a família deve, quando vence e o estado de cada fatura",
    description:
      "Escopo pelo ALUNO, nunca por id de fatura ou de contrato. `pagamentoNoAppDisponivel = false` significa que a cobrança pelo app ainda não está ligada nesta implantação: os valores continuam reais, só não há como pagar por aqui.",
  })
  @Get("students/:studentId/pagamentos")
  @Roles(...LEITURA_POR_ALUNO)
  getPagamentosDoAluno(
    @Param("studentId", ParseUUIDPipe) studentId: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.familyBillingService.getPagamentosDoAluno(studentId, actor);
  }

  @ApiOperation({
    summary: "Abre o Pix de uma fatura",
    description:
      "Reaproveita a cobrança já criada para a mesma fatura — duas tentativas de pagar nunca geram duas cobranças.",
  })
  @Post("invoices/:id/pagamento-pix")
  @Roles(...LEITURA_POR_ALUNO)
  abrirPagamentoPix(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.familyBillingService.abrirPagamentoPix(id, actor);
  }

  // --- Transportadora ---

  @ApiOperation({ summary: "Contas a receber das famílias" })
  @Get("invoices")
  @Roles(...TRANSPORTADOR_ROLES)
  listarFaturasDaEmpresa(
    @CurrentUser() actor: AuthenticatedUser,
    @Query() query: ListInvoicesQueryDto,
  ) {
    return this.familyBillingService.listarFaturasDaEmpresa(
      actor,
      { status: query.status, competencia: query.competencia },
      query.page ?? 1,
      query.pageSize ?? 20,
    );
  }

  @ApiOperation({ summary: "Para onde vai o dinheiro das mensalidades" })
  @Get("conta-de-recebimento")
  @Roles(...TRANSPORTADOR_ROLES)
  getContaDeRecebimento(@CurrentUser() actor: AuthenticatedUser) {
    return this.familyBillingService.getContaDeRecebimento(actor);
  }

  @ApiOperation({ summary: "Informa a chave Pix de recebimento" })
  @Put("conta-de-recebimento")
  @Roles(...TRANSPORTADOR_ROLES)
  salvarContaDeRecebimento(
    @CurrentUser() actor: AuthenticatedUser,
    @Body() dto: SalvarContaDeRecebimentoDto,
  ) {
    return this.familyBillingService.salvarContaDeRecebimento(actor, dto);
  }
}
