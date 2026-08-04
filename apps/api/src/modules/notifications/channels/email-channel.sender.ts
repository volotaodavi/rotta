import { Injectable, NotImplementedException } from "@nestjs/common";
import { CommunicationChannel } from "@prisma/client";

import type {
  ChannelSendInput,
  ChannelSendResult,
  ChannelSender,
} from "./channel-sender.interface";

/**
 * Canal `EMAIL` (briefing — "Criar serviço de envio de e-mails,
 * templates HTML responsivos, permitir múltiplos provedores"). Nenhum
 * provedor (ex. SES, SendGrid, Postmark) foi contratado ainda — mesmo
 * raciocínio de stub honesto do `PushChannelSender`. Substitui
 * definitivamente o log `[STUB]` avulso hoje em
 * `PasswordResetNotifierService` quando o canal E-mail estiver
 * implementado de verdade (tarefa dedicada: canal E-mail).
 */
@Injectable()
export class EmailChannelSender implements ChannelSender {
  readonly channel = CommunicationChannel.EMAIL;

  // eslint-disable-next-line @typescript-eslint/require-await
  async send(_input: ChannelSendInput): Promise<ChannelSendResult> {
    throw new NotImplementedException(
      "Envio via E-mail ainda não está disponível — integração com um provedor de e-mail pendente.",
    );
  }
}
