import { Body, Controller, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";

import { BillingService } from "./billing.service";
import { CreateCheckoutDto } from "./dto/create-checkout.dto";

import { CurrentUser, type AuthenticatedUser } from "@/common/decorators/current-user.decorator";
import { Roles } from "@/common/decorators/roles.decorator";
import { Role } from "@/shared/enums";

/**
 * API REST do módulo Billing (Dossiê 26) — só `Role.EMPRESA`/`Role.GESTOR`,
 * e sempre para a PRÓPRIA empresa (`actor.tenantId`, nunca um `:id` de
 * rota — dispensa checagem de acesso extra porque não há como pedir o
 * checkout de outra empresa por aqui). `Role.RESPONSAVEL` nunca aparece
 * nesta lista: não tem `tenantId`/`Company`, não tem mensalidade.
 */
@ApiTags("billing")
@ApiBearerAuth()
@Controller("billing")
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Post("checkout")
  @Roles(Role.EMPRESA, Role.GESTOR)
  createCheckout(@Body() dto: CreateCheckoutDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.billingService.createCheckoutForCompany(actor.tenantId as string, dto.returnUrl);
  }
}
