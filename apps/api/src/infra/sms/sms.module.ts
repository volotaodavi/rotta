import { Module } from "@nestjs/common";

import { SMS_PROVIDERS } from "./sms.constants";
import { SmsService } from "./sms.service";
import { TwilioSmsProvider } from "./twilio-sms.provider";

import type { SmsProvider } from "./sms-provider.interface";

/**
 * Infraestrutura do canal SMS (briefing — "totalmente desacoplada").
 * Adicionar um provedor novo: nova classe `SmsProvider` + registrá-la
 * em `providers`/`inject` do factory de `SMS_PROVIDERS` abaixo — nunca
 * uma alteração em `SmsService`/`SmsChannelSender`.
 */
@Module({
  providers: [
    SmsService,
    TwilioSmsProvider,
    {
      provide: SMS_PROVIDERS,
      useFactory: (twilio: TwilioSmsProvider): SmsProvider[] => [twilio],
      inject: [TwilioSmsProvider],
    },
  ],
  exports: [SmsService],
})
export class SmsModule {}
