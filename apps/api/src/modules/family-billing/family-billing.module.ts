import { Module } from "@nestjs/common";

import { FamilyBillingQueueController } from "./family-billing-queue.controller";
import { FamilyBillingSchedulerService } from "./family-billing-scheduler.service";
import {
  COMPANY_PAYMENT_ACCOUNT_REPOSITORY,
  CONTRACT_INVOICE_REPOSITORY,
} from "./family-billing.constants";
import { FamilyBillingController } from "./family-billing.controller";
import { FamilyBillingService } from "./family-billing.service";
import { LytexWebhookController } from "./lytex-webhook.controller";
import { PrismaCompanyPaymentAccountRepository } from "./repositories/prisma-company-payment-account.repository";
import { PrismaContractInvoiceRepository } from "./repositories/prisma-contract-invoice.repository";

import { CompaniesModule } from "@/modules/companies/companies.module";
import { LytexModule } from "@/modules/lytex/lytex.module";
import { StudentsModule } from "@/modules/students/students.module";
import { UsersModule } from "@/modules/users/users.module";
import { WalletModule } from "@/modules/wallet/wallet.module";

/**
 * Cobrança da família: a mensalidade do transporte, que o Responsável
 * paga à TRANSPORTADORA.
 *
 * Separado de `BillingModule` (a Rotta cobrando a transportadora pela
 * plataforma) porque são dois fluxos de dinheiro com pagador, recebedor
 * e ciclo diferentes. Desde 23/10/2026 também são duas **provedoras**:
 * a assinatura da plataforma continua no Asaas, e a mensalidade da
 * família passou para a Lytex. Os dois não compartilham mais nada, e
 * este módulo não importa mais `BillingModule`.
 *
 * `LytexModule` traz o cliente HTTP, a subconta, o split e a guarda do
 * webhook. O CONTROLADOR do webhook fica aqui, e não lá, porque ele
 * precisa do serviço da família: deixá-lo do outro lado exigiria uma
 * dependência de volta e fecharia o ciclo entre os módulos. Foi
 * justamente esse ciclo que obrigou o desenho anterior a usar barramento
 * de eventos; com a dependência de mão única, os eventos e os listeners
 * da família deixaram de ser necessários e saíram.
 *
 * `WalletModule` entra porque o pagamento confirmado vira saldo no Rotta
 * Pay do transportador quando o dinheiro passa pela conta da Rotta (sem
 * split). `StudentsModule` é quem prova a posse do aluno nas leituras do
 * Responsável: este módulo nunca decide isso por conta própria.
 *
 * `CompaniesModule` entra pela subconta do transportador: razão social,
 * documento e endereço do titular saem de `Company`, e é por isso que o
 * formulário de subconta pede um campo só.
 */
@Module({
  imports: [LytexModule, WalletModule, StudentsModule, UsersModule, CompaniesModule],
  controllers: [FamilyBillingController, FamilyBillingQueueController, LytexWebhookController],
  providers: [
    FamilyBillingService,
    FamilyBillingSchedulerService,
    { provide: CONTRACT_INVOICE_REPOSITORY, useClass: PrismaContractInvoiceRepository },
    {
      provide: COMPANY_PAYMENT_ACCOUNT_REPOSITORY,
      useClass: PrismaCompanyPaymentAccountRepository,
    },
  ],
  exports: [FamilyBillingService],
})
export class FamilyBillingModule {}
