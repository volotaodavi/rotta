import { Module } from "@nestjs/common";

import { FcmService } from "./fcm.service";

/** Infraestrutura de push notification (briefing "PUSH NOTIFICATION") — Firebase Cloud Messaging. */
@Module({
  providers: [FcmService],
  exports: [FcmService],
})
export class PushModule {}
