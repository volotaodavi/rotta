import { Injectable, NotImplementedException } from "@nestjs/common";
import { CommunicationChannel } from "@prisma/client";

import type {
  ChannelSendInput,
  ChannelSendResult,
  ChannelSender,
} from "./channel-sender.interface";

/**
 * Canal `WHATSAPP` (briefing — "Preparar arquitetura para integração com
 * WhatsApp Business API, através de provedores oficiais, com camada de
 * abstração para trocar de fornecedor futuramente"). Nenhum provedor
 * (ex. Meta Cloud API, Twilio) foi contratado ainda — mesmo raciocínio
 * de stub honesto do `PushChannelSender`: a troca para um provedor real
 * é, deliberadamente, a troca do corpo deste único método.
 */
@Injectable()
export class WhatsappChannelSender implements ChannelSender {
  readonly channel = CommunicationChannel.WHATSAPP;

  // eslint-disable-next-line @typescript-eslint/require-await
  async send(_input: ChannelSendInput): Promise<ChannelSendResult> {
    throw new NotImplementedException(
      "Envio via WhatsApp ainda não está disponível — integração com um provedor oficial da WhatsApp Business API pendente.",
    );
  }
}
