import { Module } from "@nestjs/common";

import { EMAIL_PROVIDERS } from "./email.constants";
import { EmailService } from "./email.service";
import { ResendEmailProvider } from "./resend-email.provider";

import type { EmailProvider } from "./email-provider.interface";

/**
 * Infraestrutura do canal E-mail (briefing — "permitir múltiplos
 * provedores"). Adicionar um provedor novo: nova classe `EmailProvider`
 * + registrá-la em `providers`/`inject` do factory de `EMAIL_PROVIDERS`
 * abaixo — nunca uma alteração em `EmailService`/`EmailChannelSender`.
 */
@Module({
  providers: [
    EmailService,
    ResendEmailProvider,
    {
      provide: EMAIL_PROVIDERS,
      useFactory: (resend: ResendEmailProvider): EmailProvider[] => [resend],
      inject: [ResendEmailProvider],
    },
  ],
  exports: [EmailService],
})
export class EmailModule {}
