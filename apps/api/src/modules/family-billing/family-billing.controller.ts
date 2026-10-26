import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Put, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";

/* Import de VALOR, nao `import type`: o `ValidationPipe` le os
   metadados da classe em tempo de execucao, e com `import type` o DTO
   desaparece do bundle e nada e validado. */
import { ConfigurarRecebimentoDto } from "./dto/configurar-recebimento.dto";
import { CriarAssinaturaDaFamiliaDto } from "./dto/criar-assinatura-da-familia.dto";
import { CriarSubcontaDto } from "./dto/criar-subconta.dto";
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
  @ApiOperation({
    summary: "Abre o boleto da fatura",
    description:
      "Reaproveita a cobrança que já existir na fatura, inclusive a que a assinatura gerou. A linha digitável pode vir vazia na primeira abertura, porque o registro bancário é assíncrono do lado do provedor: nesse caso o link da fatura hospedada funciona do mesmo jeito, e a linha aparece na abertura seguinte.",
  })
  @Post("invoices/:id/pagamento-boleto")
  @Roles(...LEITURA_POR_ALUNO)
  abrirPagamentoBoleto(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.familyBillingService.abrirPagamentoBoleto(id, actor);
  }

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
      "Cria a subconta na Lytex com os dados que a Rotta já tem do cadastro, por isso o corpo pede só o faturamento mensal. A conta nasce `EM_ANALISE`: a Lytex analisa em até dois dias úteis, e o estado muda sozinho pelo webhook. Recusa quando já existe subconta, porque a chave de acesso só aparece na criação e a primeira ficaria inacessível.",
  })
  @Post("conta-de-recebimento/subconta")
  @Roles(...TRANSPORTADOR_ROLES)
  criarSubconta(@CurrentUser() actor: AuthenticatedUser, @Body() dto: CriarSubcontaDto) {
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
    @Body() dto: CriarSubcontaDto,
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

  @ApiOperation({
    summary: "Taxa por meio, emissor da cobrança e custódia de uma transportadora",
    description:
      "Só o Admin Rotta: taxa é decisão de preço, o emissor decide quem responde por chargeback de até 540 dias, e a custódia tem tarifa recorrente por subconta ligada. Tudo opcional, só o que vem no corpo muda. Virar o emissor para `SUBCONTA` exige a chave da subconta guardada e a conta já aprovada; ligar custódia exige emissor `SUBCONTA`, porque a retenção segue a conta que recebe.",
  })
  @Put("admin/companies/:companyId/recebimento")
  @Roles(Role.ADMIN_ROTTA)
  configurarRecebimentoDaEmpresa(
    @Param("companyId", ParseUUIDPipe) companyId: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Body() dto: ConfigurarRecebimentoDto,
  ) {
    return this.familyBillingService.configurarRecebimentoDaEmpresa(companyId, actor, dto);
  }

  // --- A cobrança mensal automática de um contrato ---

  @ApiOperation({
    summary: "Os contratos da transportadora, com o estado da cobrança mensal",
    description:
      "A tela em que a transportadora liga a recorrência das famílias que já estão cadastradas. `precisaDeCpf` diz quando o formulário vai pedir o CPF de quem paga, e `impedimento` traz numa frase o que falta para poder ligar. O CPF nunca sai nesta resposta.",
  })
  @Get("contracts")
  @Roles(...TRANSPORTADOR_ROLES)
  listarContratosParaCobrar(@CurrentUser() actor: AuthenticatedUser) {
    return this.familyBillingService.listarContratosParaCobrar(actor);
  }

  @ApiOperation({
    summary: "Liga a cobrança mensal automática de um contrato",
    description:
      "Cria a assinatura na Lytex: a partir daí a cobrança de cada mês nasce sozinha, com o split já aplicado, e **o responsável não precisa de conta na Rotta** — ele paga pelo link da cobrança. Recusa quando o contrato já tem recorrência (cobraria a família duas vezes), quando não está ativo, e quando a mensalidade está em R$ 0,00. O primeiro vencimento pula mês que já tenha cobrança emitida.",
  })
  @Post("contracts/:contractId/assinatura")
  @Roles(...TRANSPORTADOR_ROLES)
  criarAssinaturaDoProprioContrato(
    @Param("contractId", ParseUUIDPipe) contractId: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Body() dto: CriarAssinaturaDaFamiliaDto,
  ) {
    return this.familyBillingService.criarAssinaturaDoProprioContrato(contractId, actor, dto);
  }

  @ApiOperation({
    summary: "Liga a cobrança mensal automática PELA transportadora",
    description:
      "O mesmo que a rota da transportadora, pelo painel do Admin Rotta, para quando o transportador precisa de ajuda. Mora neste módulo para a regra de 'nunca a segunda assinatura' ter um lugar só.",
  })
  @Post("admin/contracts/:contractId/assinatura")
  @Roles(Role.ADMIN_ROTTA)
  criarAssinaturaParaContrato(
    @Param("contractId", ParseUUIDPipe) contractId: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Body() dto: CriarAssinaturaDaFamiliaDto,
  ) {
    return this.familyBillingService.criarAssinaturaParaContrato(contractId, actor, dto);
  }
}
