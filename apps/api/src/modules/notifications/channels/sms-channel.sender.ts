import { Injectable, NotFoundException } from "@nestjs/common";
import { CommunicationChannel } from "@prisma/client";

import type {
  ChannelSendInput,
  ChannelSendResult,
  ChannelSender,
} from "./channel-sender.interface";

import { SmsService } from "@/infra/sms/sms.service";
import { UsersService } from "@/modules/users/users.service";

/**
 * Canal `SMS` (briefing — "Preparar arquitetura para integração com
 * provedores de SMS, totalmente desacoplada") — envia de verdade através
 * do provedor ativo (`SmsService`, hoje a Twilio). Destino sempre
 * `User.telefone` (mesmo raciocínio de `WhatsappChannelSender` — nunca
 * duplicar dado pessoal em um campo à parte).
 */
@Injectable()
export class SmsChannelSender implements ChannelSender {
  readonly channel = CommunicationChannel.SMS;

  constructor(
    private readonly smsService: SmsService,
    private readonly usersService: UsersService,
  ) {}

  async send(input: ChannelSendInput): Promise<ChannelSendResult> {
    const user = await this.usersService.findById(input.notification.userId);
    if (!user) {
      throw new NotFoundException("Usuário do destinatário não encontrado.");
    }

    await this.smsService.sendMessage(
      user.telefone,
      `${input.notification.titulo} - ${input.notification.corpo}`,
    );

    return { provedor: "sms", entregueImediatamente: false };
  }
}
