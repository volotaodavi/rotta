import { BullModule } from "@nestjs/bullmq";
import { Module } from "@nestjs/common";


import { ChannelRegistryService } from "./channels/channel-registry.service";
import { EmailChannelSender } from "./channels/email-channel.sender";
import { InAppChannelSender } from "./channels/in-app-channel.sender";
import { PushChannelSender } from "./channels/push-channel.sender";
import { SmsChannelSender } from "./channels/sms-channel.sender";
import { WhatsappChannelSender } from "./channels/whatsapp-channel.sender";
import { NotificationChannelSelectorService } from "./notification-channel-selector.service";
import { NotificationPriorityClassifierService } from "./notification-priority-classifier.service";
import {
  CHANNEL_SENDERS,
  DEVICE_TOKEN_REPOSITORY,
  NOTIFICATION_DELIVERY_ATTEMPT_REPOSITORY,
  NOTIFICATION_PREFERENCE_REPOSITORY,
  NOTIFICATION_REPOSITORY,
} from "./notifications.constants";
import { NotificationsService } from "./notifications.service";
import { NotificationDeliveryRunnerService } from "./processors/notification-delivery-runner.service";
import { NotificationsCriticalProcessor } from "./processors/notifications-critical.processor";
import { NotificationsEmailProcessor } from "./processors/notifications-email.processor";
import { NotificationsPushProcessor } from "./processors/notifications-push.processor";
import { NotificationsSmsProcessor } from "./processors/notifications-sms.processor";
import { NotificationsWhatsappProcessor } from "./processors/notifications-whatsapp.processor";
import { PrismaDeviceTokenRepository } from "./repositories/prisma-device-token.repository";
import { PrismaNotificationDeliveryAttemptRepository } from "./repositories/prisma-notification-delivery-attempt.repository";
import { PrismaNotificationPreferenceRepository } from "./repositories/prisma-notification-preference.repository";
import { PrismaNotificationRepository } from "./repositories/prisma-notification.repository";

import { PushModule } from "@/infra/push/push.module";
import { QUEUE_NAMES } from "@/infra/queue/queue.constants";
import { WhatsappModule } from "@/infra/whatsapp/whatsapp.module";
import { AuditModule } from "@/modules/audit/audit.module";
import { CompaniesModule } from "@/modules/companies/companies.module";
import { UsersModule } from "@/modules/users/users.module";

/**
 * Rotta Communication Engine (briefing "MÓDULO — ROTTA COMMUNICATION
 * ENGINE") — "Toda comunicação da plataforma deverá passar
 * exclusivamente por esse módulo". Único ponto de escrita em
 * `notifications`/`device_tokens`/`notification_preferences`/
 * `notification_delivery_attempts`; qualquer outro módulo que precise
 * notificar um usuário importa `NotificationsModule` e injeta
 * `NotificationsService` (nunca grava nessas tabelas nem chama um
 * `ChannelSender` diretamente).
 *
 * Importa `CompaniesModule` (nunca o contrário) só para
 * `CompaniesService.getEnabledChannels` — o teto de canais habilitados
 * pela EMPRESA, camada abaixo da preferência do usuário (ver
 * `NotificationsService.filterChannels`). Registra as 5 filas já
 * reservadas em `QUEUE_NAMES` (`NOTIFICATIONS_PUSH/WHATSAPP/SMS/EMAIL/
 * CRITICAL`), mesmo padrão de `GeoModule.registerQueue` — a conexão
 * Redis raiz já vem de `QueueModule` (`BullModule.forRootAsync` em
 * `AppModule`).
 */
@Module({
  imports: [
    AuditModule,
    CompaniesModule,
    UsersModule,
    PushModule,
    WhatsappModule,
    BullModule.registerQueue(
      { name: QUEUE_NAMES.NOTIFICATIONS_PUSH },
      { name: QUEUE_NAMES.NOTIFICATIONS_WHATSAPP },
      { name: QUEUE_NAMES.NOTIFICATIONS_SMS },
      { name: QUEUE_NAMES.NOTIFICATIONS_EMAIL },
      { name: QUEUE_NAMES.NOTIFICATIONS_CRITICAL },
    ),
  ],
  providers: [
    NotificationsService,
    NotificationChannelSelectorService,
    NotificationPriorityClassifierService,
    ChannelRegistryService,
    NotificationDeliveryRunnerService,
    NotificationsPushProcessor,
    NotificationsWhatsappProcessor,
    NotificationsSmsProcessor,
    NotificationsEmailProcessor,
    NotificationsCriticalProcessor,
    { provide: NOTIFICATION_REPOSITORY, useClass: PrismaNotificationRepository },
    {
      provide: NOTIFICATION_DELIVERY_ATTEMPT_REPOSITORY,
      useClass: PrismaNotificationDeliveryAttemptRepository,
    },
    { provide: DEVICE_TOKEN_REPOSITORY, useClass: PrismaDeviceTokenRepository },
    {
      provide: NOTIFICATION_PREFERENCE_REPOSITORY,
      useClass: PrismaNotificationPreferenceRepository,
    },
    {
      provide: CHANNEL_SENDERS,
      useFactory: (
        inApp: InAppChannelSender,
        push: PushChannelSender,
        whatsapp: WhatsappChannelSender,
        sms: SmsChannelSender,
        email: EmailChannelSender,
      ) => [inApp, push, whatsapp, sms, email],
      inject: [
        InAppChannelSender,
        PushChannelSender,
        WhatsappChannelSender,
        SmsChannelSender,
        EmailChannelSender,
      ],
    },
    InAppChannelSender,
    PushChannelSender,
    WhatsappChannelSender,
    SmsChannelSender,
    EmailChannelSender,
  ],
  exports: [NotificationsService],
})
export class NotificationsModule {}
