import { Module } from "@nestjs/common";

import { ChannelRegistryService } from "./channels/channel-registry.service";
import { EmailChannelSender } from "./channels/email-channel.sender";
import { InAppChannelSender } from "./channels/in-app-channel.sender";
import { PushChannelSender } from "./channels/push-channel.sender";
import { SmsChannelSender } from "./channels/sms-channel.sender";
import { WhatsappChannelSender } from "./channels/whatsapp-channel.sender";
import { CommunicationEventsListener } from "./events/communication-events.listener";
import { MessagePersonalizationModule } from "./message-personalization.module";
import { NotificationChannelSelectorService } from "./notification-channel-selector.service";
import { NotificationDashboardService } from "./notification-dashboard.service";
import { NotificationDeliveryController } from "./notification-delivery.controller";
import { NotificationInboxService } from "./notification-inbox.service";
import { NotificationPriorityClassifierService } from "./notification-priority-classifier.service";
import {
  CHANNEL_SENDERS,
  DEVICE_TOKEN_REPOSITORY,
  NOTIFICATION_DELIVERY_ATTEMPT_REPOSITORY,
  NOTIFICATION_PREFERENCE_REPOSITORY,
  NOTIFICATION_REPOSITORY,
} from "./notifications.constants";
import { NotificationsController } from "./notifications.controller";
import { NotificationsService } from "./notifications.service";
import { NotificationDeliveryRunnerService } from "./processors/notification-delivery-runner.service";
import { PrismaDeviceTokenRepository } from "./repositories/prisma-device-token.repository";
import { PrismaNotificationDeliveryAttemptRepository } from "./repositories/prisma-notification-delivery-attempt.repository";
import { PrismaNotificationPreferenceRepository } from "./repositories/prisma-notification-preference.repository";
import { PrismaNotificationRepository } from "./repositories/prisma-notification.repository";

import { EmailModule } from "@/infra/email/email.module";
import { PushModule } from "@/infra/push/push.module";
import { SmsModule } from "@/infra/sms/sms.module";
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
 * `NotificationsService.filterChannels`). As 5 filas já reservadas em
 * `QUEUE_NAMES` (`NOTIFICATIONS_PUSH/WHATSAPP/SMS/EMAIL/CRITICAL`)
 * viram `flowControlKey`s do QStash em vez de filas BullMQ registradas
 * aqui — `NotificationDeliveryController` é o único "worker" deste
 * módulo (`QstashPublisherService` já vem global de `QueueModule`, ver
 * `AppModule`).
 *
 * `CommunicationEventsListener` é o único ponto de entrada assíncrono
 * (`@nestjs/event-emitter`, já registrado globalmente em `AppModule`):
 * traduz o evento `communication.requested`, emitido pelos módulos de
 * domínio (Alunos/Escolas/Marketplace/Auth), em uma chamada real a
 * `NotificationsService.notify` — ver `events/communication-events.listener.ts`
 * para a lista de quais `NotificationEventType` já têm gatilho real.
 *
 * `MessagePersonalizationService` mora em `MessagePersonalizationModule`
 * (importado aqui, nunca redeclarado como provider próprio) exatamente
 * para que módulos de domínio que só precisam compor `titulo`/`corpo`
 * (ex. `SchoolsModule`) importem esse módulo leve em vez deste — este
 * módulo carrega `CompaniesModule`, que por sua vez alcança
 * `VehiclesModule`/`RottaAiModule`/`GeoModule`/`SchoolsModule`; se
 * `SchoolsModule` importasse `NotificationsModule` diretamente, fecharia
 * um ciclo de dependência.
 */
@Module({
  imports: [
    AuditModule,
    CompaniesModule,
    UsersModule,
    MessagePersonalizationModule,
    PushModule,
    WhatsappModule,
    SmsModule,
    EmailModule,
  ],
  controllers: [NotificationsController, NotificationDeliveryController],
  providers: [
    NotificationsService,
    NotificationInboxService,
    NotificationDashboardService,
    CommunicationEventsListener,
    NotificationChannelSelectorService,
    NotificationPriorityClassifierService,
    ChannelRegistryService,
    NotificationDeliveryRunnerService,
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
  exports: [NotificationsService, MessagePersonalizationModule],
})
export class NotificationsModule {}
