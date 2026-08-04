import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { CommunicationChannel, type Prisma } from "@prisma/client";


import { DEVICE_TOKEN_REPOSITORY } from "../notifications.constants";

import type {
  ChannelSendInput,
  ChannelSendResult,
  ChannelSender,
} from "./channel-sender.interface";
import type { DeviceTokenRepository } from "../repositories/device-token.repository";

import { FcmService } from "@/infra/push/fcm.service";

/**
 * Canal `PUSH` (briefing "PUSH NOTIFICATION" — Firebase Cloud Messaging,
 * https://firebase.google.com/docs/cloud-messaging). Fan-out para TODOS
 * os `DeviceToken`s ativos do destinatário (um usuário pode ter mais de
 * um dispositivo — celular + web, por exemplo). Tokens que o FCM reporta
 * como definitivamente inválidos são desativados aqui mesmo — a
 * "renovação automática" do briefing é do lado do dispositivo (o SDK do
 * FCM emite um token novo e o app chama `DeviceTokenRepository.
 * upsertByToken` de novo na próxima abertura); este canal só garante que
 * um token morto nunca seja tentado de novo.
 *
 * Sem `FIREBASE_PROJECT_ID`/`FIREBASE_CLIENT_EMAIL`/`FIREBASE_PRIVATE_KEY`
 * configurados, `FcmService` recusa o envio com um erro claro (nunca um
 * "sucesso" fake) — mesmo raciocínio de stub honesto que este canal
 * tinha antes da integração real.
 */
@Injectable()
export class PushChannelSender implements ChannelSender {
  readonly channel = CommunicationChannel.PUSH;

  constructor(
    private readonly fcmService: FcmService,
    @Inject(DEVICE_TOKEN_REPOSITORY) private readonly deviceTokenRepository: DeviceTokenRepository,
  ) {}

  async send(input: ChannelSendInput): Promise<ChannelSendResult> {
    const dispositivos = await this.deviceTokenRepository.listActiveByUser(
      input.notification.userId,
    );
    if (dispositivos.length === 0) {
      throw new NotFoundException(
        "Usuário não possui nenhum dispositivo com Token FCM ativo — nenhum push enviado.",
      );
    }

    const resultado = await this.fcmService.sendToTokens(
      dispositivos.map((dispositivo) => dispositivo.token),
      input.notification.titulo,
      input.notification.corpo,
      input.notification.dadosContexto as Prisma.JsonObject | undefined,
    );

    await Promise.all(
      resultado.invalidos.map((token) => this.deviceTokenRepository.deactivate(token)),
    );

    if (resultado.sucesso.length === 0) {
      throw new Error(
        `Nenhum dos ${dispositivos.length} dispositivo(s) ativo(s) recebeu o push (todos os tokens falharam).`,
      );
    }

    return { provedor: "fcm", entregueImediatamente: false };
  }
}
