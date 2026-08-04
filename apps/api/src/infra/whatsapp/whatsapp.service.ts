import { Inject, Injectable, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import { WHATSAPP_PROVIDERS } from "./whatsapp.constants";

import type { WhatsAppProvider, WhatsAppSendResult } from "./whatsapp-provider.interface";
import type { WhatsappConfig } from "@/config/whatsapp.config";

/**
 * Fachada única do canal WhatsApp — resolve o provedor ATIVO
 * (`whatsapp.config.ts#provider`) a partir dos providers registrados em
 * `WhatsappModule` e delega o envio. Nenhum código fora deste arquivo
 * conhece qual provedor concreto está em uso.
 */
@Injectable()
export class WhatsAppService {
  private readonly config: WhatsappConfig;
  private readonly providersByName: ReadonlyMap<string, WhatsAppProvider>;

  constructor(
    configService: ConfigService,
    @Inject(WHATSAPP_PROVIDERS) providers: WhatsAppProvider[],
  ) {
    this.config = configService.get<WhatsappConfig>("whatsapp")!;
    this.providersByName = new Map(providers.map((provider) => [provider.name, provider]));
  }

  async sendMessage(to: string, texto: string): Promise<WhatsAppSendResult> {
    const provider = this.providersByName.get(this.config.provider);
    if (!provider) {
      throw new ServiceUnavailableException(
        `Provedor de WhatsApp "${this.config.provider}" não está registrado (WHATSAPP_PROVIDER aponta para um provedor inexistente).`,
      );
    }

    return provider.send({ to, texto });
  }
}
