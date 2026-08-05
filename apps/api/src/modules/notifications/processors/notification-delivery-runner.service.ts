import { Inject, Injectable, Logger } from "@nestjs/common";
import { NotificationDeliveryStatus } from "@prisma/client";

import { ChannelRegistryService } from "../channels/channel-registry.service";
import {
  NOTIFICATION_DELIVERY_ATTEMPT_REPOSITORY,
  NOTIFICATION_REPOSITORY,
} from "../notifications.constants";
import { NotificationsService } from "../notifications.service";

import type { ChannelDeliveryJobData } from "./channel-delivery-job";
import type { NotificationDeliveryAttemptRepository } from "../repositories/notification-delivery-attempt.repository";
import type { NotificationRepository } from "../repositories/notification.repository";

import { PermanentDeliveryError } from "@/infra/queue/qstash/permanent-delivery-error";

/**
 * Lógica de entrega compartilhada por todo job de canal externo
 * (Push/WhatsApp/SMS/E-mail/Crítica) — chamada por
 * `NotificationDeliveryController.deliver` (o endpoint HTTP que o
 * QStash invoca, Dossiê 14), nunca diretamente por outro módulo.
 *
 * `PermanentDeliveryError` (canal ainda em stub honesto — Push/
 * WhatsApp/SMS/E-mail antes das respectivas integrações reais) é a
 * única falha tratada como PERMANENTE: nenhum retry resolve sozinho a
 * ausência de um provedor configurado, então quem chama `run()` deve
 * responder 2xx ao QStash mesmo assim (ver `NotificationDeliveryController`)
 * em vez de deixá-lo reagendar. Qualquer outro erro (rede, banco) é uma
 * falha de INFRAESTRUTURA e propaga normalmente, para o controller
 * responder um status de erro e o QStash tentar de novo sozinho
 * (`retries` configurado em `NotificationsService.notify`).
 *
 * Delivery AI (briefing "AGENTE 03" — "Monitorar Entrega, Falha...
 * Tempo de resposta. Caso falhe: Reenviar automaticamente, Trocar
 * canal"): "Reenviar automaticamente" já é o retry nativo do QStash
 * acima; `handlePermanentFailure` cobre o "trocar canal" — chamado
 * pelo controller tanto na falha imediata (`PermanentDeliveryError`)
 * quanto quando o QStash esgota todas as tentativas sem sucesso (seu
 * callback de falha, ver `failureCallbackRoute` em
 * `NotificationsService.dispatchChannel`).
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
      throw new PermanentDeliveryError(`Notificação ${data.notificationId} não existe mais.`);
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
        throw new PermanentDeliveryError(mensagem);
      }
      throw error;
    }
  }

  /** Loga uma falha de entrega — chamado pelo controller tanto numa tentativa isolada quanto no callback de falha final do QStash. */
  logFailure(data: ChannelDeliveryJobData | undefined, error: Error): void {
    this.logger.warn(
      `Entrega da notificação ${data?.notificationId} via ${data?.canal} falhou: ${error.message}`,
    );
  }

  /** "Trocar canal" (briefing "AGENTE 03") — nunca lança: uma falha ao escalar não pode derrubar a resposta ao QStash. */
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
