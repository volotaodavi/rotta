import { Injectable } from "@nestjs/common";
import { CommunicationChannel } from "@prisma/client";

import type {
  ChannelSendInput,
  ChannelSendResult,
  ChannelSender,
} from "./channel-sender.interface";

/**
 * Canal `IN_APP` (Central de Notificações Internas) — o ÚNICO canal que
 * não depende de nenhum provedor externo: a própria linha `Notification`
 * já É a entrega (o usuário lê no histórico dentro da Rotta). Por isso
 * `send` é síncrono/trivial e sempre "entrega imediatamente" — nunca
 * passa pelas filas BullMQ dos demais canais (ver
 * `NotificationsService.notify`).
 */
@Injectable()
export class InAppChannelSender implements ChannelSender {
  readonly channel = CommunicationChannel.IN_APP;

  // eslint-disable-next-line @typescript-eslint/require-await
  async send(_input: ChannelSendInput): Promise<ChannelSendResult> {
    return { provedor: "rotta-inbox", entregueImediatamente: true };
  }
}
