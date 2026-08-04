import { Inject, Injectable, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import { EMAIL_PROVIDERS } from "./email.constants";

import type { EmailProvider, EmailSendResult } from "./email-provider.interface";
import type { EmailConfig } from "@/config/email.config";

/**
 * Fachada única do canal E-mail — resolve o provedor ATIVO
 * (`email.config.ts#provider`) a partir dos providers registrados em
 * `EmailModule` e delega o envio. Nenhum código fora deste arquivo
 * conhece qual provedor concreto está em uso.
 */
@Injectable()
export class EmailService {
  private readonly config: EmailConfig;
  private readonly providersByName: ReadonlyMap<string, EmailProvider>;

  constructor(configService: ConfigService, @Inject(EMAIL_PROVIDERS) providers: EmailProvider[]) {
    this.config = configService.get<EmailConfig>("email")!;
    this.providersByName = new Map(providers.map((provider) => [provider.name, provider]));
  }

  async sendEmail(to: string, subject: string, html: string): Promise<EmailSendResult> {
    const provider = this.providersByName.get(this.config.provider);
    if (!provider) {
      throw new ServiceUnavailableException(
        `Provedor de e-mail "${this.config.provider}" não está registrado (EMAIL_PROVIDER aponta para um provedor inexistente).`,
      );
    }

    return provider.send({ to, subject, html });
  }
}
