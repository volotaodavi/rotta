import { Injectable, NotImplementedException } from "@nestjs/common";
import { CommunicationChannel } from "@prisma/client";

import type {
  ChannelSendInput,
  ChannelSendResult,
  ChannelSender,
} from "./channel-sender.interface";

/**
 * Canal `SMS` (briefing — "Preparar arquitetura para integração com
 * provedores de SMS, totalmente desacoplada"). Nenhum provedor foi
 * contratado ainda — mesmo raciocínio de stub honesto do
 * `PushChannelSender`.
 */
@Injectable()
export class SmsChannelSender implements ChannelSender {
  readonly channel = CommunicationChannel.SMS;

  // eslint-disable-next-line @typescript-eslint/require-await
  async send(_input: ChannelSendInput): Promise<ChannelSendResult> {
    throw new NotImplementedException(
      "Envio via SMS ainda não está disponível — integração com um provedor de SMS pendente.",
    );
  }
}
