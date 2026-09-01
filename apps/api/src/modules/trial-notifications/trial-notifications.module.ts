import { Module } from "@nestjs/common";

import { TrialNotificationsQueueController } from "./trial-notifications-queue.controller";
import { TrialNotificationsSchedulerService } from "./trial-notifications-scheduler.service";
import { TrialNotificationsService } from "./trial-notifications.service";

import { MessagePersonalizationModule } from "@/modules/notifications/message-personalization.module";
import { UsersModule } from "@/modules/users/users.module";

/**
 * Aviso diário de trial acabando/vencido (pedido do usuário
 * 01/09/2026). Módulo próprio (não vive em `CompaniesModule`) pelo
 * mesmo motivo de `AdminDigestModule`: é acionado por
 * cron/QStash, nunca por uma ação de usuário. `QueueModule`
 * (`QstashScheduleService`/`QstashSignatureGuard`) é `@Global()`, não
 * precisa import explícito aqui.
 */
@Module({
  imports: [UsersModule, MessagePersonalizationModule],
  controllers: [TrialNotificationsQueueController],
  providers: [TrialNotificationsService, TrialNotificationsSchedulerService],
})
export class TrialNotificationsModule {}
