import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query, Req } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";

import { BillingService, type RequestMeta } from "./billing.service";
import { CreateAdminPixChargeDto } from "./dto/create-admin-pix-charge.dto";
import { CreateAdminTransferDto } from "./dto/create-admin-transfer.dto";
import { CreateAsaasCheckoutDto } from "./dto/create-asaas-checkout.dto";
import {
  CreatePreSignupAsaasDto,
  CreatePreSignupPixDto,
} from "./dto/create-pre-signup-checkout.dto";
import { ListAdminStatementQueryDto } from "./dto/list-admin-statement-query.dto";

import type { Request } from "express";

import { AdminAreas } from "@/common/decorators/admin-areas.decorator";
import { CurrentUser, type AuthenticatedUser } from "@/common/decorators/current-user.decorator";
import { Public } from "@/common/decorators/public.decorator";
import { Roles } from "@/common/decorators/roles.decorator";
import { SkipTrialGuard } from "@/common/decorators/skip-trial-guard.decorator";
import { PlanNoticesService } from "@/modules/plan-notices/plan-notices.service";
import { AdminArea, Role } from "@/shared/enums";

function requestMeta(req: Request): RequestMeta {
  return { ip: req.ip, userAgent: req.headers["user-agent"] };
}

/**
 * API REST do módulo Billing (Dossiê 26) — só `Role.EMPRESA`/`Role.GESTOR`,
 * e sempre para a PRÓPRIA empresa (`actor.tenantId`, nunca um `:id` de
 * rota — dispensa checagem de acesso extra porque não há como pedir o
 * checkout de outra empresa por aqui). `Role.RESPONSAVEL` nunca aparece
 * nesta lista: não tem `tenantId`/`Company`, não tem mensalidade.
 * `admin/overview` é a única rota deste controller pro `Role.ADMIN_ROTTA`
 * — visão financeira cross-tenant, nunca de uma empresa específica.
 */
@ApiTags("billing")
@ApiBearerAuth()
@Controller("billing")
@SkipTrialGuard()
export class BillingController {
  constructor(
    private readonly billingService: BillingService,
    private readonly planNoticesService: PlanNoticesService,
  ) {}

  /** Checkout Pix embutido (QR Code + copia-e-cola direto na resposta — sem redirecionar). */
  @Post("checkout/pix")
  @Roles(Role.EMPRESA, Role.GESTOR)
  createPixCheckout(@CurrentUser() actor: AuthenticatedUser) {
    return this.billingService.createPixCheckoutForCompany(actor.tenantId as string);
  }

  /** Polling enquanto o cliente não paga/o webhook não chega — nunca a única confirmação (ver `BillingService.applyAsaasStatus`). */
  @Get("checkout/pix/:id/status")
  @Roles(Role.EMPRESA, Role.GESTOR)
  getPixCheckoutStatus(@Param("id") id: string) {
    return this.billingService.getPixCheckoutStatus(id);
  }

  /**
   * Checkout próprio da Rotta (Dossiê 26) pra cartão de crédito/débito
   * e boleto — processado pela Asaas por trás, sem redirecionar pra
   * fora da Rotta.
   */
  @Post("asaas/checkout")
  @Roles(Role.EMPRESA, Role.GESTOR)
  createAsaasCheckout(
    @Body() dto: CreateAsaasCheckoutDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.billingService.createAsaasCheckoutForCompany(actor.tenantId as string, dto);
  }

  /** Polling enquanto o cliente não paga/o webhook não chega (cartão) ou até baixar o boleto (mesmo papel de `checkout/pix/:id/status`). */
  @Get("asaas/checkout/:id/status")
  @Roles(Role.EMPRESA, Role.GESTOR)
  getAsaasCheckoutStatus(@Param("id") id: string) {
    return this.billingService.getAsaasCheckoutStatus(id);
  }

  /** Painel financeiro (Frente AF) — valores recebidos, taxa retida, empresas/planos ativos (100% Asaas: Pix, cartão/débito/boleto). */
  @Get("admin/overview")
  @Roles(Role.ADMIN_ROTTA)
  @AdminAreas(AdminArea.FINANCEIRO)
  getAdminOverview() {
    return this.billingService.getAdminOverview();
  }

  /** Saldo atual da conta Asaas da Rotta (Frente 33, pedido do usuário 03/09/2026: "saldo atual"). Leitura — `AdminRottaPapel.FINANCEIRO` também acessa. */
  @Get("admin/balance")
  @Roles(Role.ADMIN_ROTTA)
  @AdminAreas(AdminArea.FINANCEIRO)
  getAdminBalance() {
    return this.billingService.getAdminBalance();
  }

  /** Extrato paginado da conta Asaas da Rotta ("olhar o extrato"). Leitura — `AdminRottaPapel.FINANCEIRO` também acessa. */
  @Get("admin/statement")
  @Roles(Role.ADMIN_ROTTA)
  @AdminAreas(AdminArea.FINANCEIRO)
  getAdminStatement(@Query() query: ListAdminStatementQueryDto) {
    return this.billingService.getAdminStatement(query.page, query.pageSize);
  }

  /** Extrato completo de pagamentos de UMA empresa ("extrato completo de cada usuário que adquiriu o plano"). Leitura — `AdminRottaPapel.FINANCEIRO` também acessa. */
  @Get("admin/companies/:id/payments")
  @Roles(Role.ADMIN_ROTTA)
  @AdminAreas(AdminArea.FINANCEIRO)
  getCompanyPaymentHistory(@Param("id", ParseUUIDPipe) id: string) {
    return this.billingService.getCompanyPaymentHistory(id);
  }

  /**
   * Transferência Pix pra fora da conta Asaas da Rotta ("fazer
   * transferências"). SEM `@AdminAreas`: por design do
   * `AdminAreaGuard`, isso deixa a rota GERAL-only por padrão —
   * `AdminRottaPapel.FINANCEIRO` (só leitura) é bloqueado
   * automaticamente, sem precisar de checagem extra aqui.
   */
  @Post("admin/transfers")
  @Roles(Role.ADMIN_ROTTA)
  createAdminTransfer(
    @Body() dto: CreateAdminTransferDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.billingService.createAdminTransfer(dto, actor, requestMeta(req));
  }

  /**
   * Cobrança Pix avulsa (pedido do usuário 03/09/2026: "posso pedir o
   * recebimento de transferências... incluindo o QR Code pix?") — é um
   * RECEBÍVEL (nunca dinheiro saindo), `AdminRottaPapel.FINANCEIRO`
   * também aciona, mesmo nível de risco de `admin/balance`/`admin/statement`.
   */
  @Post("admin/pix-charges")
  @Roles(Role.ADMIN_ROTTA)
  @AdminAreas(AdminArea.FINANCEIRO)
  createAdminPixCharge(
    @Body() dto: CreateAdminPixChargeDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.billingService.createAdminPixCharge(dto, actor, requestMeta(req));
  }

  /** Polling da cobrança avulsa enquanto o pagador não paga/o webhook não chega (mesmo papel de `checkout/pix/:id/status`). */
  @Get("admin/pix-charges/:id/status")
  @Roles(Role.ADMIN_ROTTA)
  @AdminAreas(AdminArea.FINANCEIRO)
  getAdminPixChargeStatus(@Param("id") id: string) {
    return this.billingService.getPixCheckoutStatus(id);
  }

  /**
   * Estorno manual de um pagamento (pedido do usuário 03/09/2026, item
   * antes "❌" no inventário). SEM `@AdminAreas`: GERAL-only por
   * padrão, mesmo raciocínio de `admin/transfers` — devolve dinheiro
   * de verdade.
   */
  @Post("admin/payments/:id/refund")
  @Roles(Role.ADMIN_ROTTA)
  refundAdminPayment(
    @Param("id") id: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.billingService.refundAdminPayment(id, actor, requestMeta(req));
  }

  /**
   * Cancelamento manual da assinatura Asaas de uma empresa (mesmo
   * pedido, outro item "❌" do inventário). SEM `@AdminAreas`:
   * GERAL-only — para a cobrança recorrente de uma empresa é uma ação
   * tão sensível quanto mover dinheiro.
   */
  @Post("admin/companies/:id/subscription/cancel")
  @Roles(Role.ADMIN_ROTTA)
  cancelCompanySubscription(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.billingService.cancelCompanySubscription(id, actor, requestMeta(req));
  }

  /** Avisos de plano ativos (globais + os da própria empresa) — publicados pelo Admin Rotta em `/plan-notices` (painel "Controle de Planos"). */
  @Get("notices")
  @Roles(Role.EMPRESA, Role.GESTOR)
  getMyNotices(@CurrentUser() actor: AuthenticatedUser) {
    return this.planNoticesService.listActiveForCompany(actor.tenantId as string);
  }

  /**
   * Segunda forma de assinar (Dossiê 26, pedido do usuário 31/08/2026)
   * — pagar ANTES de ter conta. `@Public()`: quem chama isto não tem
   * sessão nenhuma ainda (é literalmente o objetivo do endpoint).
   */
  @Post("pre-signup/pix")
  @Public()
  createPreSignupPixCheckout(@Body() dto: CreatePreSignupPixDto) {
    return this.billingService.createPreSignupPixCheckout(dto);
  }

  /** Mesmo raciocínio de `pre-signup/pix`, cartão/débito/boleto via Asaas. */
  @Post("pre-signup/asaas")
  @Public()
  createPreSignupAsaasCheckout(@Body() dto: CreatePreSignupAsaasDto) {
    return this.billingService.createPreSignupAsaasCheckout(dto);
  }

  /** Polling do front (tela pública) enquanto aguarda o webhook confirmar o pagamento pré-cadastro. */
  @Get("pre-signup/:id/status")
  @Public()
  getPreSignupStatus(@Param("id") id: string) {
    return this.billingService.getPreSignupStatus(id);
  }
}
