import { Inject, Injectable, NotFoundException } from "@nestjs/common";

import { CHANNEL_SENDERS } from "../notifications.constants";

import type { ChannelSender } from "./channel-sender.interface";
import type { CommunicationChannel } from "@prisma/client";

/**
 * Resolve o `ChannelSender` correto para um `CommunicationChannel` em
 * runtime — o único ponto do módulo que conhece a lista completa de
 * canais registrados. Nenhum processor ou service chama um sender
 * diretamente por classe; todos passam por `getSender`, para que
 * registrar um canal novo (briefing "Arquitetura deve permitir
 * adicionar novos canais futuramente") nunca exija tocar em código
 * existente além do registro do novo provider em `NotificationsModule`.
 */
@Injectable()
export class ChannelRegistryService {
  private readonly sendersByChannel: ReadonlyMap<CommunicationChannel, ChannelSender>;

  constructor(@Inject(CHANNEL_SENDERS) senders: ChannelSender[]) {
    this.sendersByChannel = new Map(senders.map((sender) => [sender.channel, sender]));
  }

  getSender(channel: CommunicationChannel): ChannelSender {
    const sender = this.sendersByChannel.get(channel);
    if (!sender) {
      throw new NotFoundException(`Nenhum ChannelSender registrado para o canal ${channel}.`);
    }
    return sender;
  }
}
