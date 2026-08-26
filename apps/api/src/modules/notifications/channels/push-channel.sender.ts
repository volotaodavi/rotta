import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { CommunicationChannel, DeviceTokenPlatform, type Prisma } from "@prisma/client";

import { ExpoPushService } from "@/infra/push/expo-push.service";
import { WebPushService } from "@/infra/push/web-push.service";

import { DEVICE_TOKEN_REPOSITORY } from "../notifications.constants";

import type {
  ChannelSendInput,
  ChannelSendResult,
  ChannelSender,
} from "./channel-sender.interface";
import type { DeviceTokenRepository } from "../repositories/device-token.repository";


/**
 * Canal `PUSH` — fan-out para TODOS os `DeviceToken`s ativos do
 * destinatário (um usuário pode ter mais de um dispositivo — celular +
 * web, por exemplo). Roteia por `DeviceToken.plataforma`: `WEB` vai
 * pro `WebPushService` (Web Push padrão, RFC 8030, par de chaves VAPID
 * gerado localmente); `ANDROID`/`IOS` vão pro `ExpoPushService`
 * (serviço de push do próprio Expo) — decisão do usuário: "fazer tudo
 * (móbile + web), porém pegando de forma gratuita", sem depender de
 * nenhum console externo (nem Firebase). Tokens que o provedor reporta
 * como definitivamente inválidos são desativados aqui mesmo — a
 * "renovação automática" do briefing é do lado do dispositivo (o SDK
 * emite um token/inscrição novo e o app chama
 * `DeviceTokenRepository.upsertByToken` de novo na próxima abertura);
 * este canal só garante que um token morto nunca seja tentado de novo.
 */
@Injectable()
export class PushChannelSender implements ChannelSender {
  readonly channel = CommunicationChannel.PUSH;

  constructor(
    private readonly expoPushService: ExpoPushService,
    private readonly webPushService: WebPushService,
    @Inject(DEVICE_TOKEN_REPOSITORY) private readonly deviceTokenRepository: DeviceTokenRepository,
  ) {}

  async send(input: ChannelSendInput): Promise<ChannelSendResult> {
    const dispositivos = await this.deviceTokenRepository.listActiveByUser(
      input.notification.userId,
    );
    if (dispositivos.length === 0) {
      throw new NotFoundException(
        "Usuário não possui nenhum dispositivo com token de push ativo — nenhum push enviado.",
      );
    }

    const tokensWeb = dispositivos
      .filter((dispositivo) => dispositivo.plataforma === DeviceTokenPlatform.WEB)
      .map((dispositivo) => dispositivo.token);
    const tokensMobile = dispositivos
      .filter((dispositivo) => dispositivo.plataforma !== DeviceTokenPlatform.WEB)
      .map((dispositivo) => dispositivo.token);

    const dados = input.notification.dadosContexto as Prisma.JsonObject | undefined;

    const [resultadoWeb, resultadoMobile] = await Promise.all([
      tokensWeb.length > 0
        ? this.webPushService.sendToTokens(
            tokensWeb,
            input.notification.titulo,
            input.notification.corpo,
            dados,
          )
        : Promise.resolve({ sucesso: [], invalidos: [] }),
      tokensMobile.length > 0
        ? this.expoPushService.sendToTokens(
            tokensMobile,
            input.notification.titulo,
            input.notification.corpo,
            dados,
          )
        : Promise.resolve({ sucesso: [], invalidos: [] }),
    ]);

    const invalidos = [...resultadoWeb.invalidos, ...resultadoMobile.invalidos];
    const sucesso = [...resultadoWeb.sucesso, ...resultadoMobile.sucesso];

    await Promise.all(invalidos.map((token) => this.deviceTokenRepository.deactivate(token)));

    if (sucesso.length === 0) {
      throw new Error(
        `Nenhum dos ${dispositivos.length} dispositivo(s) ativo(s) recebeu o push (todos os tokens falharam).`,
      );
    }

    return { provedor: "expo+webpush", entregueImediatamente: false };
  }
}
