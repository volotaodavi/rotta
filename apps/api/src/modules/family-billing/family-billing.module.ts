import { Module } from "@nestjs/common";

import { FamilyBillingQueueController } from "./family-billing-queue.controller";
import { FamilyBillingSchedulerService } from "./family-billing-scheduler.service";
import {
  COMPANY_PAYMENT_ACCOUNT_REPOSITORY,
  CONTRACT_INVOICE_REPOSITORY,
} from "./family-billing.constants";
import { FamilyBillingController } from "./family-billing.controller";
import { FamilyBillingService } from "./family-billing.service";
import { AsaasAccountStatusListener } from "./listeners/asaas-account-status.listener";
import { FamilyInvoiceWebhookListener } from "./listeners/family-invoice-webhook.listener";
import { PrismaCompanyPaymentAccountRepository } from "./repositories/prisma-company-payment-account.repository";
import { PrismaContractInvoiceRepository } from "./repositories/prisma-contract-invoice.repository";

import { BillingModule } from "@/modules/billing/billing.module";
import { CompaniesModule } from "@/modules/companies/companies.module";
import { StudentsModule } from "@/modules/students/students.module";
import { UsersModule } from "@/modules/users/users.module";
import { WalletModule } from "@/modules/wallet/wallet.module";

/**
 * Cobrança da família — a mensalidade do transporte, que o Responsável
 * paga à TRANSPORTADORA.
 *
 * Separado de `BillingModule` (a Rotta cobrando a transportadora pela
 * plataforma) porque são dois fluxos de dinheiro com pagador, recebedor
 * e ciclo diferentes. O que eles compartilham é só o cliente HTTP da
 * Asaas, importado daqui — mesma chave, mesmo tratamento de erro, mesmo
 * registro de saúde da integração, em vez de um segundo cliente falando
 * com a mesma API.
 *
 * `WalletModule` entra porque o pagamento confirmado vira saldo no Rotta
 * Pay do transportador quando o dinheiro passa pela conta da Rotta (sem
 * split). `StudentsModule` é quem prova a posse do aluno nas leituras do
 * Responsável — este módulo nunca decide isso por conta própria.
 *
 * `CompaniesModule` entra pela subconta Asaas do transportador: razão
 * social, documento e endereço do titular saem de `Company`, e é por
 * isso que o formulário de subconta pede um campo só. Sem ciclo —
 * `CompaniesModule` não importa este, e nem poderia: `BillingModule`
 * já importa `CompaniesModule`.
 *
 * Sem ciclo: `BillingModule` não importa este. A volta (o webhook da
 * Asaas avisando que uma fatura foi paga, ou que a situação de uma
 * subconta mudou) acontece pelo barramento de eventos — ver
 * `FamilyInvoiceWebhookListener` e `AsaasAccountStatusListener`.
 */
@Module({
  imports: [BillingModule, WalletModule, StudentsModule, UsersModule, CompaniesModule],
  controllers: [FamilyBillingController, FamilyBillingQueueController],
  providers: [
    FamilyBillingService,
    FamilyBillingSchedulerService,
    FamilyInvoiceWebhookListener,
    AsaasAccountStatusListener,
    { provide: CONTRACT_INVOICE_REPOSITORY, useClass: PrismaContractInvoiceRepository },
    {
      provide: COMPANY_PAYMENT_ACCOUNT_REPOSITORY,
      useClass: PrismaCompanyPaymentAccountRepository,
    },
  ],
  exports: [FamilyBillingService],
})
export class FamilyBillingModule {}
