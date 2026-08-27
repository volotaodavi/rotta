import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";

import { BillingService } from "./billing.service";
import { CreateAsaasCheckoutDto } from "./dto/create-asaas-checkout.dto";
import { CreateCheckoutDto } from "./dto/create-checkout.dto";

import { CurrentUser, type AuthenticatedUser } from "@/common/decorators/current-user.decorator";
import { Roles } from "@/common/decorators/roles.decorator";
import { SkipTrialGuard } from "@/common/decorators/skip-trial-guard.decorator";
import { Role } from "@/shared/enums";

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
  constructor(private readonly billingService: BillingService) {}

  @Post("checkout")
  @Roles(Role.EMPRESA, Role.GESTOR)
  createCheckout(@Body() dto: CreateCheckoutDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.billingService.createCheckoutForCompany(actor.tenantId as string, dto.returnUrl);
  }

  /** Checkout Pix embutido (QR Code + copia-e-cola direto na resposta — sem redirecionar). */
  @Post("checkout/pix")
  @Roles(Role.EMPRESA, Role.GESTOR)
  createPixCheckout(@CurrentUser() actor: AuthenticatedUser) {
    return this.billingService.createPixCheckoutForCompany(actor.tenantId as string);
  }

  /** Polling enquanto o cliente não paga/o webhook não chega — nunca a única confirmação (ver `BillingService.applyPixPayment`). */
  @Get("checkout/pix/:id/status")
  @Roles(Role.EMPRESA, Role.GESTOR)
  getPixCheckoutStatus(@Param("id") id: string) {
    return this.billingService.getPixCheckoutStatus(id);
  }

  /**
   * Checkout próprio da Rotta (Dossiê 26) pra cartão de crédito/débito
   * e boleto — processado pela Asaas por trás, sem redirecionar pra
   * fora da Rotta (diferente do checkout de cartão da AbacatePay,
   * `POST /checkout` acima).
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

  /** Painel financeiro (Frente AF) — valores recebidos, taxa retida, empresas/planos ativos, AbacatePay (Pix) e Asaas (cartão/débito/boleto) lado a lado. */
  @Get("admin/overview")
  @Roles(Role.ADMIN_ROTTA)
  getAdminOverview() {
    return this.billingService.getAdminOverview();
  }
}
