import { Module } from "@nestjs/common";

import { ExpoPushService } from "./expo-push.service";
import { FcmService } from "./fcm.service";
import { WebPushService } from "./web-push.service";

/**
 * Infraestrutura de push notification real (briefing "PUSH
 * NOTIFICATION") — `PushChannelSender` roteia por
 * `DeviceToken.plataforma`: `WEB` → `WebPushService` (VAPID/RFC 8030);
 * `ANDROID`/`IOS` → `ExpoPushService` (serviço de push do próprio
 * Expo). `FcmService` (Firebase Admin) permanece aqui por
 * compatibilidade — nenhum token real nesse formato jamais existiu em
 * produção (o gap que motivou esta frente inteira: nenhum client
 * jamais chamou `registerDeviceToken`), mas removê-lo não traz
 * benefício e aumentaria o raio de mudança à toa.
 */
@Module({
  providers: [FcmService, ExpoPushService, WebPushService],
  exports: [FcmService, ExpoPushService, WebPushService],
})
export class PushModule {}
