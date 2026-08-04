import { InjectQueue } from "@nestjs/bullmq";
import { Inject, Injectable, Logger } from "@nestjs/common";
import {
  CommunicationChannel,
  NotificationDeliveryStatus,
  NotificationPriority,
} from "@prisma/client";


import { ChannelRegistryService } from "./channels/channel-registry.service";
import { NotificationChannelSelectorService } from "./notification-channel-selector.service";
import { NotificationPriorityClassifierService } from "./notification-priority-classifier.service";
import {
  NOTIFICATION_DELIVERY_ATTEMPT_REPOSITORY,
  NOTIFICATION_PREFERENCE_REPOSITORY,
  NOTIFICATION_REPOSITORY,
} from "./notifications.constants";
import { isQuietHoursActive } from "./quiet-hours.util";

import type { NotifyInput } from "./dto/notify-input";
import type { ChannelDeliveryJobData } from "./processors/channel-delivery-job";
import type { NotificationDeliveryAttemptRepository } from "./repositories/notification-delivery-attempt.repository";
import type { NotificationPreferenceRepository } from "./repositories/notification-preference.repository";
import type { NotificationRepository } from "./repositories/notification.repository";
import type { NotificationChannel as CompanyNotificationChannel } from "@/modules/companies/dto/update-company-settings.dto";
import type { Notification } from "@prisma/client";
import type { Queue } from "bullmq";

import { QUEUE_NAMES } from "@/infra/queue/queue.constants";
import { AuditLogService } from "@/modules/audit/audit-log.service";
import { CompaniesService } from "@/modules/companies/companies.service";

const EXTERNAL_CHANNEL_JOB_OPTS = {
  attempts: 3,
  backoff: { type: "exponential" as const, delay: 5_000 },
  removeOnComplete: true,
  removeOnFail: 1_000,
};

type PreferenceChannelKey = "receberPush" | "receberWhatsapp" | "receberSms" | "receberEmail";

const PREFERENCE_KEY_BY_CHANNEL: Partial<Record<CommunicationChannel, PreferenceChannelKey>> = {
  [CommunicationChannel.PUSH]: "receberPush",
  [CommunicationChannel.WHATSAPP]: "receberWhatsapp",
  [CommunicationChannel.SMS]: "receberSms",
  [CommunicationChannel.EMAIL]: "receberEmail",
};

const COMPANY_SETTING_KEY_BY_CHANNEL: Partial<
  Record<CommunicationChannel, CompanyNotificationChannel>
> = {
  [CommunicationChannel.PUSH]: "push",
  [CommunicationChannel.WHATSAPP]: "whatsapp",
  [CommunicationChannel.SMS]: "sms",
  [CommunicationChannel.EMAIL]: "email",
};

/**
 * Cadeia de fallback do Delivery AI (briefing "AGENTE 03" — "Caso
 * falhe: ... Trocar canal") — Push é o canal mais barato/rápido, então
 * vira WhatsApp, depois SMS (mais caro, mas quase nunca falha por rede
 * do destinatário), e por fim E-mail (último recurso, sem limite de
 * "janela de atendimento" como o WhatsApp). `EMAIL` não tem fallback —
 * já é o último elo.
 */
const FALLBACK_CHANNEL: Partial<Record<CommunicationChannel, CommunicationChannel>> = {
  [CommunicationChannel.PUSH]: CommunicationChannel.WHATSAPP,
  [CommunicationChannel.WHATSAPP]: CommunicationChannel.SMS,
  [CommunicationChannel.SMS]: CommunicationChannel.EMAIL,
};

/** Só prioridades a partir daqui justificam o custo/ruído de um canal extra automático — informativa/importante já têm o inbox interno como registro permanente. */
const ESCALATION_PRIORITIES: ReadonlySet<NotificationPriority> = new Set([
  NotificationPriority.URGENTE,
  NotificationPriority.CRITICA,
  NotificationPriority.EMERGENCIA,
]);

/**
 * Rotta Communication Engine (briefing "MÓDULO — ROTTA COMMUNICATION
 * ENGINE") — ÚNICO ponto de entrada para QUALQUER comunicação da
 * plataforma. Nenhum outro módulo grava em `notifications`/envia um
 * push/WhatsApp/SMS/e-mail diretamente; todos injetam
 * `NotificationsService` e chamam `notify()`.
 *
 * Pipeline de `notify`:
 * 1. Prioridade (`NotificationPriorityClassifierService`, "Agente 02")
 *    e canais desejados (`NotificationChannelSelectorService`, "Rotta
 *    Communication AI") — a menos que o chamador já os informe.
 * 2. Filtro por camadas independentes (nenhuma sobrepõe a outra):
 *    canal habilitado pela EMPRESA (`CompanySetting.canaisNotificacao`)
 *    → habilitado pelo USUÁRIO (`NotificationPreference`) → fora do
 *    Quiet Hours (exceto `EMERGENCIA`, nunca silenciada).
 * 3. `Notification` é SEMPRE criada (o registro da Central de
 *    Notificações não depende de nenhum canal externo ter sido
 *    liberado) e `IN_APP` está sempre no conjunto final.
 * 4. Um `NotificationDeliveryAttempt` por canal final: `IN_APP` é
 *    resolvido de forma síncrona (a própria linha já é a entrega); os
 *    demais são enfileirados via BullMQ (`NOTIFICATIONS_CRITICAL` para
 *    `EMERGENCIA`, a fila específica do canal nos demais casos) e
 *    processados pelos 5 processors deste módulo.
 */
@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private readonly queueByChannel: Partial<
    Record<CommunicationChannel, Queue<ChannelDeliveryJobData>>
  >;

  constructor(
    @Inject(NOTIFICATION_REPOSITORY)
    private readonly notificationRepository: NotificationRepository,
    @Inject(NOTIFICATION_DELIVERY_ATTEMPT_REPOSITORY)
    private readonly deliveryAttemptRepository: NotificationDeliveryAttemptRepository,
    @Inject(NOTIFICATION_PREFERENCE_REPOSITORY)
    private readonly preferenceRepository: NotificationPreferenceRepository,
    private readonly channelSelector: NotificationChannelSelectorService,
    private readonly priorityClassifier: NotificationPriorityClassifierService,
    private readonly channelRegistry: ChannelRegistryService,
    private readonly companiesService: CompaniesService,
    private readonly auditLogService: AuditLogService,
    @InjectQueue(QUEUE_NAMES.NOTIFICATIONS_PUSH) pushQueue: Queue<ChannelDeliveryJobData>,
    @InjectQueue(QUEUE_NAMES.NOTIFICATIONS_WHATSAPP) whatsappQueue: Queue<ChannelDeliveryJobData>,
    @InjectQueue(QUEUE_NAMES.NOTIFICATIONS_SMS) smsQueue: Queue<ChannelDeliveryJobData>,
    @InjectQueue(QUEUE_NAMES.NOTIFICATIONS_EMAIL) emailQueue: Queue<ChannelDeliveryJobData>,
    @InjectQueue(QUEUE_NAMES.NOTIFICATIONS_CRITICAL)
    private readonly criticalQueue: Queue<ChannelDeliveryJobData>,
  ) {
    this.queueByChannel = {
      [CommunicationChannel.PUSH]: pushQueue,
      [CommunicationChannel.WHATSAPP]: whatsappQueue,
      [CommunicationChannel.SMS]: smsQueue,
      [CommunicationChannel.EMAIL]: emailQueue,
    };
  }

  async notify(input: NotifyInput): Promise<Notification> {
    const prioridade = input.prioridade ?? this.priorityClassifier.classify(input.tipo);
    const desejados = new Set(input.canais ?? this.channelSelector.selectChannels(input.tipo));
    desejados.add(CommunicationChannel.IN_APP);

    const canaisFinais = await this.filterChannels(
      input.userId,
      input.companyId,
      prioridade,
      desejados,
    );

    const notification = await this.notificationRepository.create({
      userId: input.userId,
      companyId: input.companyId,
      tipo: input.tipo,
      prioridade,
      titulo: input.titulo,
      corpo: input.corpo,
      dadosContexto: input.dadosContexto,
      canaisEscolhidos: [...canaisFinais],
    });

    await Promise.all(
      [...canaisFinais].map((canal) => this.dispatchChannel(notification, canal, prioridade)),
    );

    await this.recordAudit(notification);

    return notification;
  }

  /**
   * Delivery AI (briefing "AGENTE 03" — "Monitorar Entrega, Falha...
   * Caso falhe: Reenviar automaticamente, Trocar canal, Registrar
   * auditoria"). Chamado por `NotificationDeliveryRunnerService` quando
   * um canal esgota todas as tentativas do BullMQ (retry automático já
   * aconteceu) ou falha de forma definitiva (`UnrecoverableError`) —
   * este método é o "trocar canal": só escala para
   * `URGENTE`/`CRITICA`/`EMERGENCIA` (briefing — nunca ruído extra numa
   * notificação informativa), nunca repete um canal já presente em
   * `canaisEscolhidos` (evita reenviar um canal que já está rodando em
   * paralelo) e passa pelo MESMO filtro de empresa/usuário/Quiet Hours
   * de `notify` — a escalação nunca ignora uma preferência do
   * destinatário.
   */
  async escalateToFallback(
    notificationId: string,
    canalFalho: CommunicationChannel,
  ): Promise<void> {
    const notification = await this.notificationRepository.findByIdInternal(notificationId);
    if (!notification || !ESCALATION_PRIORITIES.has(notification.prioridade)) return;

    const fallback = FALLBACK_CHANNEL[canalFalho];
    if (!fallback || notification.canaisEscolhidos.includes(fallback)) return;

    const permitido = await this.filterChannels(
      notification.userId,
      notification.companyId ?? undefined,
      notification.prioridade,
      new Set([fallback]),
    );
    if (!permitido.has(fallback)) return;

    await this.notificationRepository.addChannel(notification.id, fallback);
    await this.dispatchChannel(notification, fallback, notification.prioridade);
    await this.recordEscalationAudit(notification, canalFalho, fallback);
  }

  private async filterChannels(
    userId: string,
    companyId: string | undefined,
    prioridade: NotificationPriority,
    desejados: Set<CommunicationChannel>,
  ): Promise<Set<CommunicationChannel>> {
    const resultado = new Set<CommunicationChannel>([CommunicationChannel.IN_APP]);
    const canaisExternos = [...desejados].filter((canal) => canal !== CommunicationChannel.IN_APP);
    if (canaisExternos.length === 0) return resultado;

    const [preference, canaisEmpresa] = await Promise.all([
      this.preferenceRepository.findByUser(userId),
      companyId ? this.companiesService.getEnabledChannels(companyId) : Promise.resolve(null),
    ]);

    const silenciado = isQuietHoursActive(
      {
        silenciarFinsDeSemana: preference?.silenciarFinsDeSemana ?? false,
        quietHoursInicio: preference?.quietHoursInicio ?? null,
        quietHoursFim: preference?.quietHoursFim ?? null,
      },
      prioridade,
    );

    for (const canal of canaisExternos) {
      if (silenciado) continue;

      const prefKey = PREFERENCE_KEY_BY_CHANNEL[canal];
      if (prefKey && preference && preference[prefKey] === false) continue;

      const companyKey = COMPANY_SETTING_KEY_BY_CHANNEL[canal];
      if (companyKey && canaisEmpresa && !canaisEmpresa.includes(companyKey)) continue;

      resultado.add(canal);
    }

    return resultado;
  }

  private async dispatchChannel(
    notification: Notification,
    canal: CommunicationChannel,
    prioridade: NotificationPriority,
  ): Promise<void> {
    if (canal === CommunicationChannel.IN_APP) {
      const attempt = await this.deliveryAttemptRepository.create({
        notificationId: notification.id,
        canal,
        status: NotificationDeliveryStatus.PENDENTE,
      });
      const resultado = await this.channelRegistry.getSender(canal).send({ notification });
      const agora = new Date();
      await this.deliveryAttemptRepository.update(attempt.id, {
        status: NotificationDeliveryStatus.ENTREGUE,
        provedor: resultado.provedor,
        enviadoEm: agora,
        entregueEm: agora,
        tempoRespostaMs: 0,
      });
      return;
    }

    const attempt = await this.deliveryAttemptRepository.create({
      notificationId: notification.id,
      canal,
      status: NotificationDeliveryStatus.ENFILEIRADA,
    });

    const queue =
      prioridade === NotificationPriority.EMERGENCIA
        ? this.criticalQueue
        : this.queueByChannel[canal];
    if (!queue) {
      this.logger.warn(`Nenhuma fila registrada para o canal ${canal} — entrega não enfileirada.`);
      return;
    }

    await queue.add(
      canal.toLowerCase(),
      { notificationId: notification.id, deliveryAttemptId: attempt.id, canal },
      EXTERNAL_CHANNEL_JOB_OPTS,
    );
  }

  /**
   * Auditoria é sempre best-effort em relação ao envio principal — mesmo
   * princípio de `CompaniesService.recordAudit`: perder o registro de
   * auditoria não pode reverter uma notificação já validamente criada.
   */
  private async recordAudit(notification: Notification): Promise<void> {
    try {
      await this.auditLogService.record({
        companyId: notification.companyId ?? undefined,
        entidadeTipo: "Notification",
        entidadeId: notification.id,
        acao: "NOTIFICATION_SENT",
        dadosDepois: {
          tipo: notification.tipo,
          prioridade: notification.prioridade,
          canais: notification.canaisEscolhidos,
        },
      });
    } catch (error) {
      this.logger.warn(
        `Falha ao registrar auditoria (Notification ${notification.id})`,
        error as Error,
      );
    }
  }

  /** Best-effort — mesmo raciocínio de `recordAudit`. */
  private async recordEscalationAudit(
    notification: Notification,
    canalFalho: CommunicationChannel,
    canalFallback: CommunicationChannel,
  ): Promise<void> {
    try {
      await this.auditLogService.record({
        companyId: notification.companyId ?? undefined,
        entidadeTipo: "Notification",
        entidadeId: notification.id,
        acao: "NOTIFICATION_CHANNEL_ESCALATED",
        dadosAntes: { canalFalho },
        dadosDepois: { canalFallback },
      });
    } catch (error) {
      this.logger.warn(
        `Falha ao registrar auditoria de escalonamento (Notification ${notification.id})`,
        error as Error,
      );
    }
  }
}
