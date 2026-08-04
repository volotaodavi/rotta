import { Injectable, NotFoundException } from "@nestjs/common";
import { CommunicationChannel } from "@prisma/client";

import type {
  ChannelSendInput,
  ChannelSendResult,
  ChannelSender,
} from "./channel-sender.interface";

import { WhatsAppService } from "@/infra/whatsapp/whatsapp.service";
import { UsersService } from "@/modules/users/users.service";


/**
 * Canal `WHATSAPP` (briefing — "Preparar arquitetura para integração com
 * WhatsApp Business API, através de provedores oficiais, com camada de
 * abstração para trocar de fornecedor futuramente") — envia de verdade
 * através do provedor ativo (`WhatsAppService`, hoje a Meta Cloud API).
 * O destino é sempre `User.telefone` (nunca um campo à parte só para
 * WhatsApp — o mesmo telefone cadastrado no perfil, briefing "SEGURANÇA":
 * nunca duplicar dado pessoal desnecessariamente).
 */
@Injectable()
export class WhatsappChannelSender implements ChannelSender {
  readonly channel = CommunicationChannel.WHATSAPP;

  constructor(
    private readonly whatsAppService: WhatsAppService,
    private readonly usersService: UsersService,
  ) {}

  async send(input: ChannelSendInput): Promise<ChannelSendResult> {
    const user = await this.usersService.findById(input.notification.userId);
    if (!user) {
      throw new NotFoundException("Usuário do destinatário não encontrado.");
    }

    await this.whatsAppService.sendMessage(
      user.telefone,
      `${input.notification.titulo}\n${input.notification.corpo}`,
    );

    return { provedor: "whatsapp", entregueImediatamente: false };
  }
}
