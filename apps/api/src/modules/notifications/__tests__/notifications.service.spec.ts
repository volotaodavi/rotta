import { CommunicationChannel, NotificationEventType, NotificationPriority } from "@prisma/client";

import { NotificationsService } from "../notifications.service";

import type { ChannelRegistryService } from "../channels/channel-registry.service";
import type { ChannelSender } from "../channels/channel-sender.interface";
import type { NotifyInput } from "../dto/notify-input";
import type { NotificationChannelSelectorService } from "../notification-channel-selector.service";
import type { NotificationPriorityClassifierService } from "../notification-priority-classifier.service";
import type { NotificationDeliveryAttemptRepository } from "../repositories/notification-delivery-attempt.repository";
import type { NotificationPreferenceRepository } from "../repositories/notification-preference.repository";
import type { NotificationRepository } from "../repositories/notification.repository";
import type { AuditLogService } from "@/modules/audit/audit-log.service";
import type { CompaniesService } from "@/modules/companies/companies.service";
import type { Notification, NotificationPreference } from "@prisma/client";
import type { Queue } from "bullmq";

function buildNotification(overrides: Partial<Notification> = {}): Notification {
  return {
    id: "notification-1",
    userId: "user-1",
    companyId: null,
    tipo: NotificationEventType.VIAGEM_INICIADA,
    prioridade: NotificationPriority.INFORMATIVA,
    titulo: "Título",
    corpo: "Corpo",
    dadosContexto: null,
    canaisEscolhidos: [CommunicationChannel.IN_APP, CommunicationChannel.PUSH],
    lida: false,
    lidaEm: null,
    favoritada: false,
    arquivada: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function buildPreference(overrides: Partial<NotificationPreference> = {}): NotificationPreference {
  return {
    userId: "user-1",
    receberPush: true,
    receberWhatsapp: true,
    receberSms: true,
    receberEmail: true,
    silenciarFinsDeSemana: false,
    quietHoursInicio: null,
    quietHoursFim: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as NotificationPreference;
}

function buildQueue(): jest.Mocked<Queue<never>> {
  return { add: jest.fn().mockResolvedValue(undefined) } as unknown as jest.Mocked<Queue<never>>;
}

describe("NotificationsService", () => {
  let notificationRepository: jest.Mocked<NotificationRepository>;
  let deliveryAttemptRepository: jest.Mocked<NotificationDeliveryAttemptRepository>;
  let preferenceRepository: jest.Mocked<NotificationPreferenceRepository>;
  let channelSelector: jest.Mocked<Pick<NotificationChannelSelectorService, "selectChannels">>;
  let priorityClassifier: jest.Mocked<Pick<NotificationPriorityClassifierService, "classify">>;
  let channelRegistry: jest.Mocked<Pick<ChannelRegistryService, "getSender">>;
  let companiesService: jest.Mocked<Pick<CompaniesService, "getEnabledChannels">>;
  let auditLogService: jest.Mocked<Pick<AuditLogService, "record">>;
  let pushQueue: jest.Mocked<Queue<never>>;
  let whatsappQueue: jest.Mocked<Queue<never>>;
  let smsQueue: jest.Mocked<Queue<never>>;
  let emailQueue: jest.Mocked<Queue<never>>;
  let criticalQueue: jest.Mocked<Queue<never>>;
  let inAppSender: jest.Mocked<ChannelSender>;
  let service: NotificationsService;

  beforeEach(() => {
    notificationRepository = {
      create: jest.fn(),
      findByIdForUser: jest.fn(),
      findByIdInternal: jest.fn(),
      addChannel: jest.fn(),
      list: jest.fn(),
      markRead: jest.fn(),
      markAllRead: jest.fn(),
      setFavorita: jest.fn(),
      setArquivada: jest.fn(),
      delete: jest.fn(),
      countByCompany: jest.fn(),
      countByPriority: jest.fn(),
      countByType: jest.fn(),
      countByChannel: jest.fn(),
    };
    deliveryAttemptRepository = {
      create: jest.fn(),
      update: jest.fn(),
      findById: jest.fn(),
      listByNotification: jest.fn(),
      statsByCompany: jest.fn(),
    };
    preferenceRepository = { findByUser: jest.fn(), upsert: jest.fn() };
    channelSelector = { selectChannels: jest.fn().mockReturnValue([CommunicationChannel.PUSH]) };
    priorityClassifier = { classify: jest.fn().mockReturnValue(NotificationPriority.INFORMATIVA) };
    inAppSender = {
      channel: CommunicationChannel.IN_APP,
      send: jest.fn().mockResolvedValue({ provedor: "rotta-inbox", entregueImediatamente: true }),
    };
    channelRegistry = { getSender: jest.fn().mockReturnValue(inAppSender) };
    companiesService = { getEnabledChannels: jest.fn() };
    auditLogService = { record: jest.fn().mockResolvedValue(undefined) };
    pushQueue = buildQueue();
    whatsappQueue = buildQueue();
    smsQueue = buildQueue();
    emailQueue = buildQueue();
    criticalQueue = buildQueue();

    notificationRepository.create.mockImplementation((data) =>
      Promise.resolve(buildNotification({ ...data } as Partial<Notification>)),
    );
    deliveryAttemptRepository.create.mockResolvedValue({ id: "attempt-1" } as never);
    deliveryAttemptRepository.update.mockResolvedValue({} as never);

    service = new NotificationsService(
      notificationRepository,
      deliveryAttemptRepository,
      preferenceRepository,
      channelSelector,
      priorityClassifier,
      channelRegistry as unknown as ChannelRegistryService,
      companiesService as unknown as CompaniesService,
      auditLogService as unknown as AuditLogService,
      pushQueue,
      whatsappQueue,
      smsQueue,
      emailQueue,
      criticalQueue,
    );
  });

  function baseInput(overrides: Partial<NotifyInput> = {}): NotifyInput {
    return {
      userId: "user-1",
      tipo: NotificationEventType.VIAGEM_INICIADA,
      titulo: "Título",
      corpo: "Corpo",
      ...overrides,
    };
  }

  describe("notify — resolução de prioridade/canal", () => {
    it("usa o classificador/seletor quando o chamador não informa canais/prioridade", async () => {
      preferenceRepository.findByUser.mockResolvedValue(null);
      await service.notify(baseInput());

      expect(priorityClassifier.classify).toHaveBeenCalledWith(
        NotificationEventType.VIAGEM_INICIADA,
      );
      expect(channelSelector.selectChannels).toHaveBeenCalledWith(
        NotificationEventType.VIAGEM_INICIADA,
      );
    });

    it("respeita prioridade/canais explícitos do chamador (override raro)", async () => {
      preferenceRepository.findByUser.mockResolvedValue(null);
      await service.notify(
        baseInput({ prioridade: NotificationPriority.CRITICA, canais: [CommunicationChannel.SMS] }),
      );

      expect(priorityClassifier.classify).not.toHaveBeenCalled();
      expect(channelSelector.selectChannels).not.toHaveBeenCalled();
      expect(notificationRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ prioridade: NotificationPriority.CRITICA }),
      );
    });

    it("IN_APP está sempre presente no conjunto final, mesmo que não solicitado", async () => {
      preferenceRepository.findByUser.mockResolvedValue(null);
      channelSelector.selectChannels.mockReturnValue([CommunicationChannel.PUSH]);

      await service.notify(baseInput());

      const dadosCriados = notificationRepository.create.mock.calls[0]?.[0];
      expect(dadosCriados?.canaisEscolhidos).toEqual(
        expect.arrayContaining([CommunicationChannel.IN_APP]),
      );
    });

    it("a Notification é sempre criada mesmo quando nenhum canal externo passa no filtro", async () => {
      preferenceRepository.findByUser.mockResolvedValue(buildPreference({ receberPush: false }));
      channelSelector.selectChannels.mockReturnValue([CommunicationChannel.PUSH]);

      await service.notify(baseInput());

      expect(notificationRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ canaisEscolhidos: [CommunicationChannel.IN_APP] }),
      );
    });
  });

  describe("filterChannels — camadas independentes", () => {
    it("bloqueia um canal desabilitado na preferência do USUÁRIO", async () => {
      preferenceRepository.findByUser.mockResolvedValue(buildPreference({ receberPush: false }));
      channelSelector.selectChannels.mockReturnValue([CommunicationChannel.PUSH]);

      await service.notify(baseInput());

      expect(pushQueue.add).not.toHaveBeenCalled();
    });

    it("bloqueia um canal não habilitado pela EMPRESA quando há companyId", async () => {
      preferenceRepository.findByUser.mockResolvedValue(buildPreference());
      companiesService.getEnabledChannels.mockResolvedValue(["email"]);
      channelSelector.selectChannels.mockReturnValue([CommunicationChannel.PUSH]);

      await service.notify(baseInput({ companyId: "company-1" }));

      expect(companiesService.getEnabledChannels).toHaveBeenCalledWith("company-1");
      expect(pushQueue.add).not.toHaveBeenCalled();
    });

    it("nunca consulta a empresa quando a notificação não tem companyId", async () => {
      preferenceRepository.findByUser.mockResolvedValue(buildPreference());
      channelSelector.selectChannels.mockReturnValue([CommunicationChannel.PUSH]);

      await service.notify(baseInput());

      expect(companiesService.getEnabledChannels).not.toHaveBeenCalled();
      expect(pushQueue.add).toHaveBeenCalled();
    });

    it("Quiet Hours silencia canais externos mas nunca o IN_APP", async () => {
      preferenceRepository.findByUser.mockResolvedValue(
        buildPreference({ quietHoursInicio: "00:00", quietHoursFim: "23:59" }),
      );
      channelSelector.selectChannels.mockReturnValue([CommunicationChannel.PUSH]);

      await service.notify(baseInput());

      expect(pushQueue.add).not.toHaveBeenCalled();
      expect(notificationRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ canaisEscolhidos: [CommunicationChannel.IN_APP] }),
      );
    });

    it("EMERGENCIA nunca é silenciada por Quiet Hours", async () => {
      preferenceRepository.findByUser.mockResolvedValue(
        buildPreference({ quietHoursInicio: "00:00", quietHoursFim: "23:59" }),
      );
      channelSelector.selectChannels.mockReturnValue([CommunicationChannel.PUSH]);

      await service.notify(baseInput({ prioridade: NotificationPriority.EMERGENCIA }));

      expect(criticalQueue.add).toHaveBeenCalled();
    });
  });

  describe("dispatchChannel", () => {
    it("IN_APP é resolvido de forma síncrona (nunca enfileirado)", async () => {
      preferenceRepository.findByUser.mockResolvedValue(null);
      channelSelector.selectChannels.mockReturnValue([]);

      await service.notify(baseInput());

      expect(inAppSender.send).toHaveBeenCalled();
      expect(deliveryAttemptRepository.update).toHaveBeenCalledWith(
        "attempt-1",
        expect.objectContaining({ status: "ENTREGUE" }),
      );
      expect(pushQueue.add).not.toHaveBeenCalled();
    });

    it("canais externos são enfileirados na fila específica do canal (não EMERGENCIA)", async () => {
      preferenceRepository.findByUser.mockResolvedValue(buildPreference());
      channelSelector.selectChannels.mockReturnValue([CommunicationChannel.WHATSAPP]);

      await service.notify(baseInput());

      expect(whatsappQueue.add).toHaveBeenCalledWith(
        "whatsapp",
        expect.objectContaining({ canal: CommunicationChannel.WHATSAPP }),
        expect.any(Object),
      );
      expect(criticalQueue.add).not.toHaveBeenCalled();
    });

    it("EMERGENCIA sempre vai para a fila crítica, mesmo o canal tendo fila própria", async () => {
      preferenceRepository.findByUser.mockResolvedValue(buildPreference());
      channelSelector.selectChannels.mockReturnValue([CommunicationChannel.SMS]);

      await service.notify(baseInput({ prioridade: NotificationPriority.EMERGENCIA }));

      expect(criticalQueue.add).toHaveBeenCalled();
      expect(smsQueue.add).not.toHaveBeenCalled();
    });
  });

  describe("auditoria (best-effort)", () => {
    it("notify nunca falha quando a auditoria falha", async () => {
      preferenceRepository.findByUser.mockResolvedValue(null);
      auditLogService.record.mockRejectedValue(new Error("db indisponível"));

      await expect(service.notify(baseInput())).resolves.toBeDefined();
    });

    it("notify registra NOTIFICATION_SENT com sucesso", async () => {
      preferenceRepository.findByUser.mockResolvedValue(null);
      await service.notify(baseInput());

      expect(auditLogService.record).toHaveBeenCalledWith(
        expect.objectContaining({ entidadeTipo: "Notification", acao: "NOTIFICATION_SENT" }),
      );
    });
  });

  describe("escalateToFallback", () => {
    it("não faz nada quando a notificação não existe mais", async () => {
      notificationRepository.findByIdInternal.mockResolvedValue(null);
      await service.escalateToFallback("notification-1", CommunicationChannel.PUSH);
      expect(notificationRepository.addChannel).not.toHaveBeenCalled();
    });

    it("não escala prioridades abaixo de URGENTE (nunca ruído extra numa notificação informativa)", async () => {
      notificationRepository.findByIdInternal.mockResolvedValue(
        buildNotification({ prioridade: NotificationPriority.INFORMATIVA }),
      );
      await service.escalateToFallback("notification-1", CommunicationChannel.PUSH);
      expect(notificationRepository.addChannel).not.toHaveBeenCalled();
    });

    it("não escala quando o canal não tem fallback (EMAIL é o último elo)", async () => {
      notificationRepository.findByIdInternal.mockResolvedValue(
        buildNotification({ prioridade: NotificationPriority.URGENTE }),
      );
      await service.escalateToFallback("notification-1", CommunicationChannel.EMAIL);
      expect(notificationRepository.addChannel).not.toHaveBeenCalled();
    });

    it("não escala quando o canal de fallback já está presente (evita reenviar em paralelo)", async () => {
      notificationRepository.findByIdInternal.mockResolvedValue(
        buildNotification({
          prioridade: NotificationPriority.URGENTE,
          canaisEscolhidos: [CommunicationChannel.PUSH, CommunicationChannel.WHATSAPP],
        }),
      );
      await service.escalateToFallback("notification-1", CommunicationChannel.PUSH);
      expect(notificationRepository.addChannel).not.toHaveBeenCalled();
    });

    it("não escala quando o filtro (preferência/quiet hours/empresa) bloqueia o fallback", async () => {
      notificationRepository.findByIdInternal.mockResolvedValue(
        buildNotification({
          prioridade: NotificationPriority.URGENTE,
          canaisEscolhidos: [CommunicationChannel.PUSH],
        }),
      );
      preferenceRepository.findByUser.mockResolvedValue(
        buildPreference({ receberWhatsapp: false }),
      );

      await service.escalateToFallback("notification-1", CommunicationChannel.PUSH);

      expect(notificationRepository.addChannel).not.toHaveBeenCalled();
    });

    it("escala PUSH -> WHATSAPP: adiciona o canal, despacha e audita a escalação", async () => {
      const notification = buildNotification({
        prioridade: NotificationPriority.URGENTE,
        canaisEscolhidos: [CommunicationChannel.PUSH],
      });
      notificationRepository.findByIdInternal.mockResolvedValue(notification);
      preferenceRepository.findByUser.mockResolvedValue(buildPreference());
      notificationRepository.addChannel.mockResolvedValue(notification);

      await service.escalateToFallback("notification-1", CommunicationChannel.PUSH);

      expect(notificationRepository.addChannel).toHaveBeenCalledWith(
        "notification-1",
        CommunicationChannel.WHATSAPP,
      );
      expect(whatsappQueue.add).toHaveBeenCalled();
      expect(auditLogService.record).toHaveBeenCalledWith(
        expect.objectContaining({ acao: "NOTIFICATION_CHANNEL_ESCALATED" }),
      );
    });

    it("escala WHATSAPP -> SMS e SMS -> EMAIL (cadeia completa do briefing)", async () => {
      preferenceRepository.findByUser.mockResolvedValue(buildPreference());

      const notificationWhats = buildNotification({
        prioridade: NotificationPriority.CRITICA,
        canaisEscolhidos: [CommunicationChannel.WHATSAPP],
      });
      notificationRepository.findByIdInternal.mockResolvedValue(notificationWhats);
      notificationRepository.addChannel.mockResolvedValue(notificationWhats);
      await service.escalateToFallback("notification-1", CommunicationChannel.WHATSAPP);
      expect(smsQueue.add).toHaveBeenCalled();

      const notificationSms = buildNotification({
        prioridade: NotificationPriority.CRITICA,
        canaisEscolhidos: [CommunicationChannel.SMS],
      });
      notificationRepository.findByIdInternal.mockResolvedValue(notificationSms);
      notificationRepository.addChannel.mockResolvedValue(notificationSms);
      await service.escalateToFallback("notification-1", CommunicationChannel.SMS);
      expect(emailQueue.add).toHaveBeenCalled();
    });

    it("escalateToFallback nunca falha quando a auditoria de escalonamento falha", async () => {
      const notification = buildNotification({
        prioridade: NotificationPriority.URGENTE,
        canaisEscolhidos: [CommunicationChannel.PUSH],
      });
      notificationRepository.findByIdInternal.mockResolvedValue(notification);
      preferenceRepository.findByUser.mockResolvedValue(buildPreference());
      notificationRepository.addChannel.mockResolvedValue(notification);
      auditLogService.record.mockRejectedValue(new Error("db indisponível"));

      await expect(
        service.escalateToFallback("notification-1", CommunicationChannel.PUSH),
      ).resolves.toBeUndefined();
    });
  });
});
