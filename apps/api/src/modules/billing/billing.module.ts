import { Module } from "@nestjs/common";

import { AsaasClientService } from "./asaas-client.service";
import { AsaasSubcontasService } from "./asaas-subcontas.service";
import { AsaasWebhookController } from "./asaas-webhook.controller";
import { AsaasWebhookGuard } from "./asaas-webhook.guard";
import { BillingQueueController } from "./billing-queue.controller";
import { BillingSchedulerService } from "./billing-scheduler.service";
import { BillingController } from "./billing.controller";
import { BillingService } from "./billing.service";
import { CobrancaController } from "./cobranca.controller";
import { CobrancaService } from "./cobranca.service";
import { ASAAS_WEBHOOK_EVENT_REPOSITORY } from "./repositories/asaas-webhook-event.repository";
import { PrismaAsaasWebhookEventRepository } from "./repositories/prisma-asaas-webhook-event.repository";

import { EmailModule } from "@/infra/email/email.module";
import { SecurityModule } from "@/infra/security/security.module";
import { AuditModule } from "@/modules/audit/audit.module";
import { DiretoriaReadGuard } from "@/modules/client-errors/diretoria-read.guard";
import { CompaniesModule } from "@/modules/companies/companies.module";
import { MarketingModule } from "@/modules/marketing/marketing.module";
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
    MarketingModule,
    SecurityModule,
  ],
  controllers: [
    BillingController,
    AsaasWebhookController,
    BillingQueueController,
    CobrancaController,
  ],
  providers: [
    AsaasClientService,
    BillingService,
    AsaasWebhookGuard,
    BillingSchedulerService,
    CobrancaService,
    DiretoriaReadGuard,
    AsaasSubcontasService,
    {
      provide: ASAAS_WEBHOOK_EVENT_REPOSITORY,
      useClass: PrismaAsaasWebhookEventRepository,
    },
  ],
  // `BillingService` exportado pra `AdminDigestModule` reaproveitar
  // (`reconciliarPagamentosAsaas`, resumo semanal/mensal do Admin
  // Rotta) sem duplicar a lógica de reconciliação Asaas.
  // `AsaasClientService` exportado (17/10/2026) para o modulo de
  // cobranca da familia (`FamilyBillingModule`) criar cobranca Pix no
  // MESMO cliente Asaas, com a mesma chave, o mesmo tratamento de erro
  // e o mesmo registro de saude da integracao -- em vez de um segundo
  // cliente HTTP falando com a mesma API.
  // `AsaasSubcontasService` exportado (20/10/2026) para a cobranca da
  // familia montar o split da fatura. A subconta e a chave vivem aqui,
  // junto do cliente Asaas, e nao duplicadas la.
  exports: [BillingService, CobrancaService, AsaasClientService, AsaasSubcontasService],
})
export class BillingModule {}
