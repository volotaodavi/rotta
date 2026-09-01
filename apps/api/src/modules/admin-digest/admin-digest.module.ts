import { Module } from "@nestjs/common";

import { AdminDigestQueueController } from "./admin-digest-queue.controller";
import { AdminDigestSchedulerService } from "./admin-digest-scheduler.service";
import { AdminDigestService } from "./admin-digest.service";

import { EmailModule } from "@/infra/email/email.module";
import { BillingModule } from "@/modules/billing/billing.module";
import { MessagePersonalizationModule } from "@/modules/notifications/message-personalization.module";
import { UsersModule } from "@/modules/users/users.module";

/**
 * "Informativos da Rotta" pro Admin (pedido do usuário 01/09/2026) —
 * resumo semanal/mensal (novos clientes, assinaturas, chamados de
 * suporte, faturamento/lucro líquido). Módulo cross-domain próprio
 * (não vive em `BillingModule`/`SupportModule`) porque lê os dois
 * domínios pra montar UM resumo — nenhum dos dois deveria depender do
 * outro só por causa disto. `QueueModule` (`QstashScheduleService`/
 * `QstashSignatureGuard`) é `@Global()`, não precisa import explícito
 * aqui — mesmo padrão de `BillingModule`.
 */
@Module({
  imports: [BillingModule, UsersModule, MessagePersonalizationModule, EmailModule],
  controllers: [AdminDigestQueueController],
  providers: [AdminDigestService, AdminDigestSchedulerService],
})
export class AdminDigestModule {}
