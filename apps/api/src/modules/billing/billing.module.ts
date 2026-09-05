import { Module } from "@nestjs/common";

import { AsaasClientService } from "./asaas-client.service";
import { AsaasWebhookController } from "./asaas-webhook.controller";
import { AsaasWebhookGuard } from "./asaas-webhook.guard";
import { BillingQueueController } from "./billing-queue.controller";
import { BillingSchedulerService } from "./billing-scheduler.service";
import { BillingController } from "./billing.controller";
import { BillingService } from "./billing.service";

import { EmailModule } from "@/infra/email/email.module";
import { AuditModule } from "@/modules/audit/audit.module";
import { CompaniesModule } from "@/modules/companies/companies.module";
import { MessagePersonalizationModule } from "@/modules/notifications/message-personalization.module";
import { PlanNoticesModule } from "@/modules/plan-notices/plan-notices.module";
import { UsersModule } from "@/modules/users/users.module";

/**
 * Módulo Billing (Dossiê 26) — a Rotta cobrando a mensalidade das
 * empresas/transportadoras/autônomos (R$ 39,90/mês), 100% via Asaas
 * (Pix, cartão de crédito/débito e boleto — checkout próprio da Rotta,
 * pedido do usuário 05/09/2026: "Nós usaremos 100% Asaas, esquece a
 * AbacatePay"). Nunca cobra o Responsável (100% gratuito, sem
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
    AuditModule,
  ],
  controllers: [BillingController, AsaasWebhookController, BillingQueueController],
  providers: [AsaasClientService, BillingService, AsaasWebhookGuard, BillingSchedulerService],
  // `BillingService` exportado pra `AdminDigestModule` reaproveitar
  // (`reconciliarPagamentosAsaas`, resumo semanal/mensal do Admin
  // Rotta) sem duplicar a lógica de reconciliação Asaas.
  exports: [BillingService],
})
export class BillingModule {}
