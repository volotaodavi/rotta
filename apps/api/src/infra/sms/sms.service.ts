import { Inject, Injectable, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import { SMS_PROVIDERS } from "./sms.constants";

import type { SmsProvider, SmsSendResult } from "./sms-provider.interface";
import type { SmsConfig } from "@/config/sms.config";

/**
 * Fachada única do canal SMS — resolve o provedor ATIVO
 * (`sms.config.ts#provider`) a partir dos providers registrados em
 * `SmsModule` e delega o envio. Nenhum código fora deste arquivo
 * conhece qual provedor concreto está em uso.
 */
@Injectable()
export class SmsService {
  private readonly config: SmsConfig;
  private readonly providersByName: ReadonlyMap<string, SmsProvider>;

  constructor(configService: ConfigService, @Inject(SMS_PROVIDERS) providers: SmsProvider[]) {
    this.config = configService.get<SmsConfig>("sms")!;
    this.providersByName = new Map(providers.map((provider) => [provider.name, provider]));
  }

  async sendMessage(to: string, texto: string): Promise<SmsSendResult> {
    const provider = this.providersByName.get(this.config.provider);
    if (!provider) {
      throw new ServiceUnavailableException(
        `Provedor de SMS "${this.config.provider}" não está registrado (SMS_PROVIDER aponta para um provedor inexistente).`,
      );
    }

    return provider.send({ to, texto });
  }
}
