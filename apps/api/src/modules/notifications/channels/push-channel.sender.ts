import { Injectable, NotImplementedException } from "@nestjs/common";
import { CommunicationChannel } from "@prisma/client";

import type {
  ChannelSendInput,
  ChannelSendResult,
  ChannelSender,
} from "./channel-sender.interface";

/**
 * Canal `PUSH` (briefing "PUSH NOTIFICATION" — Firebase Cloud Messaging,
 * https://firebase.google.com/docs/cloud-messaging). Nenhuma credencial
 * do Firebase Admin SDK foi configurada neste módulo ainda — implementar
 * um "sucesso" fake aqui seria pior do que declarar honestamente que o
 * envio real ainda não roda, já que o `NotificationDeliveryAttempt`
 * gravado a partir daqui alimenta o dashboard de comunicação e a
 * auditoria (briefing "LOGS") — nenhum consumidor pode confiar numa
 * entrega simulada como se fosse real.
 *
 * Contrato estabilizado desde já (`ChannelSender`) para que o resto do
 * Communication Engine já rode ponta a ponta contra esta interface; a
 * troca para o Firebase Admin SDK real será, deliberadamente, a troca do
 * corpo deste único método (tarefa dedicada: canal Push/FCM).
 */
@Injectable()
export class PushChannelSender implements ChannelSender {
  readonly channel = CommunicationChannel.PUSH;

  // eslint-disable-next-line @typescript-eslint/require-await
  async send(_input: ChannelSendInput): Promise<ChannelSendResult> {
    throw new NotImplementedException(
      "Envio via Push (FCM) ainda não está disponível — integração com o Firebase Admin SDK pendente.",
    );
  }
}
