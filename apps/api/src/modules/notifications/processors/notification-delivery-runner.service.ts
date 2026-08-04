import { Inject, Injectable, Logger } from "@nestjs/common";
import { NotificationDeliveryStatus } from "@prisma/client";
import { type Job, UnrecoverableError } from "bullmq";

import { ChannelRegistryService } from "../channels/channel-registry.service";
import {
  NOTIFICATION_DELIVERY_ATTEMPT_REPOSITORY,
  NOTIFICATION_REPOSITORY,
} from "../notifications.constants";
import { NotificationsService } from "../notifications.service";

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
 *
 * Delivery AI (briefing "AGENTE 03" — "Monitorar Entrega, Falha...
 * Tempo de resposta. Caso falhe: Reenviar automaticamente, Trocar
 * canal"): "Reenviar automaticamente" já é o retry nativo do BullMQ
 * acima; `isPermanentFailure`/`handlePermanentFailure` cobrem o "trocar
 * canal" — chamados pelos processors quando o BullMQ esgota as
 * tentativas (ou a falha já nasceu `UnrecoverableError`), delegando a
 * decisão de escalar para `NotificationsService.escalateToFallback`.
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
    private readonly notificationsService: NotificationsService,
  ) {}

  async run(data: ChannelDeliveryJobData): Promise<void> {
    const notification = await this.notificationRepository.findByIdInternal(data.notificationId);
    if (!notification) {
      throw new UnrecoverableError(`Notificação ${data.notificationId} não existe mais.`);
    }

    const inicio = Date.now();
    try {
      const resultado = await this.channelRegistry.getSender(data.canal).send({ notification });
      const agora = new Date();
      await this.deliveryAttemptRepository.update(data.deliveryAttemptId, {
        status: NotificationDeliveryStatus.ENVIADA,
        provedor: resultado.provedor,
        enviadoEm: agora,
        entregueEm: resultado.entregueImediatamente ? agora : undefined,
        tempoRespostaMs: Date.now() - inicio,
      });
    } catch (error) {
      const mensagem = error instanceof Error ? error.message : String(error);
      await this.deliveryAttemptRepository.update(data.deliveryAttemptId, {
        status: NotificationDeliveryStatus.FALHOU,
        erro: mensagem,
        tempoRespostaMs: Date.now() - inicio,
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

  /** Verdadeiro quando o BullMQ NÃO vai tentar de novo — ou a falha já nasceu definitiva, ou esta foi a última tentativa configurada. */
  isPermanentFailure(job: Job<ChannelDeliveryJobData>, error: Error): boolean {
    if (error instanceof UnrecoverableError) return true;
    const maxAttempts = job.opts.attempts ?? 1;
    return job.attemptsMade >= maxAttempts;
  }

  /** "Trocar canal" (briefing "AGENTE 03") — nunca lança: uma falha ao escalar não pode derrubar o worker. */
  async handlePermanentFailure(data: ChannelDeliveryJobData): Promise<void> {
    try {
      await this.notificationsService.escalateToFallback(data.notificationId, data.canal);
    } catch (error) {
      this.logger.warn(
        `Falha ao escalar canal de fallback (Notification ${data.notificationId}, canal ${data.canal})`,
        error as Error,
      );
    }
  }
}
