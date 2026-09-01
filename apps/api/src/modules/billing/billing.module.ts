import { Module } from "@nestjs/common";

import { AbacatePayClientService } from "./abacatepay-client.service";
import { AbacatePayWebhookController } from "./abacatepay-webhook.controller";
import { AbacatePayWebhookGuard } from "./abacatepay-webhook.guard";
import { AsaasClientService } from "./asaas-client.service";
import { AsaasWebhookController } from "./asaas-webhook.controller";
import { AsaasWebhookGuard } from "./asaas-webhook.guard";
import { BillingQueueController } from "./billing-queue.controller";
import { BillingSchedulerService } from "./billing-scheduler.service";
import { BillingController } from "./billing.controller";
import { BillingService } from "./billing.service";

import { EmailModule } from "@/infra/email/email.module";
import { CompaniesModule } from "@/modules/companies/companies.module";
import { MessagePersonalizationModule } from "@/modules/notifications/message-personalization.module";
import { PlanNoticesModule } from "@/modules/plan-notices/plan-notices.module";
import { UsersModule } from "@/modules/users/users.module";

/**
 * Módulo Billing (Dossiê 26) — a Rotta cobrando a mensalidade das
 * empresas/transportadoras/autônomos (R$ 39,90/mês): Pix via AbacatePay,
 * cartão de crédito/débito e boleto via Asaas (checkout próprio da
 * Rotta). Nunca cobra o Responsável (100% gratuito, sem
 * `Company`/`tenantId`).
 *
 * Importa `CompaniesModule` só pelo `COMPANY_REPOSITORY` que ela
 * exporta — este módulo nunca reimplementa acesso a `Prisma.company`.
 */
@Module({
  imports: [
    CompaniesModule,
    PlanNoticesModule,
    UsersModule,
    MessagePersonalizationModule,
    EmailModule,
  ],
  controllers: [
    BillingController,
    AbacatePayWebhookController,
    AsaasWebhookController,
    BillingQueueController,
  ],
  providers: [
    AbacatePayClientService,
    AsaasClientService,
    BillingService,
    AbacatePayWebhookGuard,
    AsaasWebhookGuard,
    BillingSchedulerService,
  ],
  // `AbacatePayClientService` exportado pra `AdminDigestModule`
  // reaproveitar (resumo semanal/mensal do Admin Rotta) sem duplicar
  // uma segunda instância do client.
  exports: [AbacatePayClientService],
})
export class BillingModule {}
