import { Module } from "@nestjs/common";

import { MetaCloudApiWhatsAppProvider } from "./meta-cloud-api-whatsapp.provider";
import { WHATSAPP_PROVIDERS } from "./whatsapp.constants";
import { WhatsAppService } from "./whatsapp.service";

import type { WhatsAppProvider } from "./whatsapp-provider.interface";

/**
 * Infraestrutura do canal WhatsApp (briefing — "camada de abstração para
 * trocar de fornecedor futuramente"). Adicionar um provedor novo: nova
 * classe `WhatsAppProvider` + registrá-la em `providers`/`inject` do
 * factory de `WHATSAPP_PROVIDERS` abaixo — nunca uma alteração em
 * `WhatsAppService`/`WhatsappChannelSender`.
 */
@Module({
  providers: [
    WhatsAppService,
    MetaCloudApiWhatsAppProvider,
    {
      provide: WHATSAPP_PROVIDERS,
      useFactory: (metaCloudApi: MetaCloudApiWhatsAppProvider): WhatsAppProvider[] => [
        metaCloudApi,
      ],
      inject: [MetaCloudApiWhatsAppProvider],
    },
  ],
  exports: [WhatsAppService],
})
export class WhatsappModule {}
