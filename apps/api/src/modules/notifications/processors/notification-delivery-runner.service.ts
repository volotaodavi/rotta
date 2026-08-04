import { Inject, Injectable, Logger } from "@nestjs/common";
import { NotificationDeliveryStatus } from "@prisma/client";
import { UnrecoverableError } from "bullmq";

import { ChannelRegistryService } from "../channels/channel-registry.service";
import {
  NOTIFICATION_DELIVERY_ATTEMPT_REPOSITORY,
  NOTIFICATION_REPOSITORY,
} from "../notifications.constants";

import type { ChannelDeliveryJobData } from "./channel-delivery-job";
import type { NotificationDeliveryAttemptRepository } from "../repositories/notification-delivery-attempt.repository";
import type { NotificationRepository } from "../repositories/notification.repository";

/**
 * Lógica de entrega compartilhada pelos 5 processors (um por fila de
 * `QUEUE_NAMES`) — cada processor é uma classe `@Processor` distinta
 * (exigência do BullMQ, uma `WorkerHost` por fila), mas todas delegam a
 * este único serviço para nunca duplicar "carregar notificação, resolver
 * sender, atualizar `NotificationDeliveryAttempt`".
 *
 * `NotImplementedException` (canal ainda em stub honesto — Push/
 * WhatsApp/SMS/E-mail antes das respectivas integrações reais) é tratada
 * como falha PERMANENTE (`UnrecoverableError`): nenhum retry resolve
 * sozinho a ausência de um provedor configurado. Qualquer outro erro
 * (rede, banco) é uma falha de INFRAESTRUTURA e propaga normalmente,
 * para o `attempts`/`backoff` do BullMQ (configurados em
 * `NotificationsService.notify`) tentarem de novo.
 */
@Injectable()
export class NotificationDeliveryRunnerService {
  private readonly logger = new Logger(NotificationDeliveryRunnerService.name);

  constructor(
    @Inject(NOTIFICATION_REPOSITORY)
    private readonly notificationRepository: NotificationRepository,
    @Inject(NOTIFICATION_DELIVERY_ATTEMPT_REPOSITORY)
    private readonly deliveryAttemptRepository: NotificationDeliveryAttemptRepository,
    private readonly channelRegistry: ChannelRegistryService,
  ) {}

  async run(data: ChannelDeliveryJobData): Promise<void> {
    const notification = await this.notificationRepository.findByIdInternal(data.notificationId);
    if (!notification) {
      throw new UnrecoverableError(`Notificação ${data.notificationId} não existe mais.`);
    }

    try {
      const resultado = await this.channelRegistry.getSender(data.canal).send({ notification });
      const agora = new Date();
      await this.deliveryAttemptRepository.update(data.deliveryAttemptId, {
        status: NotificationDeliveryStatus.ENVIADA,
        provedor: resultado.provedor,
        enviadoEm: agora,
        entregueEm: resultado.entregueImediatamente ? agora : undefined,
      });
    } catch (error) {
      const mensagem = error instanceof Error ? error.message : String(error);
      await this.deliveryAttemptRepository.update(data.deliveryAttemptId, {
        status: NotificationDeliveryStatus.FALHOU,
        erro: mensagem,
      });

      if (error instanceof Error && error.name === "NotImplementedException") {
        throw new UnrecoverableError(mensagem);
      }
      throw error;
    }
  }

  logFailure(data: ChannelDeliveryJobData | undefined, attemptsMade: number, error: Error): void {
    this.logger.warn(
      `Entrega da notificação ${data?.notificationId} via ${data?.canal} falhou (tentativa ${attemptsMade}): ${error.message}`,
    );
  }
}
