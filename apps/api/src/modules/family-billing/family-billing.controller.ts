import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Put, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";

/* Import de VALOR, nao `import type`: o `ValidationPipe` le os
   metadados da classe em tempo de execucao, e com `import type` o DTO
   desaparece do bundle e nada e validado. */
import { CriarSubcontaAsaasDto } from "./dto/criar-subconta-asaas.dto";
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

  @ApiOperation({
    summary: "Abre a conta de recebimento da transportadora, sem sair da Rotta",
    description:
      "Cria a subconta no Asaas com os dados que a Rotta já tem do cadastro, por isso o corpo pede só o faturamento mensal. A conta nasce `EM_ANALISE`: o Asaas analisa em até dois dias úteis, e o estado muda sozinho pelo webhook. Recusa quando já existe subconta, porque a chave de acesso só aparece na criação e a primeira ficaria inacessível.",
  })
  @Post("conta-de-recebimento/subconta")
  @Roles(...TRANSPORTADOR_ROLES)
  criarSubconta(@CurrentUser() actor: AuthenticatedUser, @Body() dto: CriarSubcontaAsaasDto) {
    return this.familyBillingService.criarSubcontaDaPropriaEmpresa(actor, dto);
  }

  // --- Admin Rotta ---

  @ApiOperation({
    summary: "Abre a conta de recebimento PELA transportadora",
    description:
      "O mesmo que o endpoint da transportadora, pelo painel do Admin Rotta, para quando o transportador precisa de ajuda. Mora neste módulo, e não no Backoffice, para a regra de 'nunca a segunda subconta' ter um lugar só.",
  })
  @Post("admin/companies/:companyId/subconta")
  @Roles(Role.ADMIN_ROTTA)
  criarSubcontaParaEmpresa(
    @Param("companyId", ParseUUIDPipe) companyId: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Body() dto: CriarSubcontaAsaasDto,
  ) {
    return this.familyBillingService.criarSubcontaParaEmpresa(companyId, actor, dto);
  }

  @ApiOperation({
    summary: "A conta de recebimento de uma transportadora, pelo painel do Admin",
    description: "Nunca a chave da subconta: só se ela existe (`podeEmitirPelaSubconta`).",
  })
  @Get("admin/companies/:companyId/conta-de-recebimento")
  @Roles(Role.ADMIN_ROTTA)
  getContaDeRecebimentoDaEmpresa(
    @Param("companyId", ParseUUIDPipe) companyId: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.familyBillingService.getContaDeRecebimentoDaEmpresa(companyId, actor);
  }
}
