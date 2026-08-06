import { Module } from "@nestjs/common";

import { AbacatePayClientService } from "./abacatepay-client.service";
import { AbacatePayWebhookController } from "./abacatepay-webhook.controller";
import { AbacatePayWebhookGuard } from "./abacatepay-webhook.guard";
import { BillingController } from "./billing.controller";
import { BillingService } from "./billing.service";

import { CompaniesModule } from "@/modules/companies/companies.module";

/**
 * Módulo Billing (Dossiê 26) — a Rotta cobrando a mensalidade das
 * empresas/transportadoras/autônomos via AbacatePay (R$ 39,90/mês).
 * Nunca cobra o Responsável (100% gratuito, sem `Company`/`tenantId`).
 *
 * Importa `CompaniesModule` só pelo `COMPANY_REPOSITORY` que ela
 * exporta — este módulo nunca reimplementa acesso a `Prisma.company`.
 */
@Module({
  imports: [CompaniesModule],
  controllers: [BillingController, AbacatePayWebhookController],
  providers: [AbacatePayClientService, BillingService, AbacatePayWebhookGuard],
})
export class BillingModule {}
