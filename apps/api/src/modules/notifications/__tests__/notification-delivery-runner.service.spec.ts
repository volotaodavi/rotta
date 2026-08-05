import { NotificationDeliveryRunnerService } from "../processors/notification-delivery-runner.service";

import type { ChannelRegistryService } from "../channels/channel-registry.service";
import type { ChannelSender } from "../channels/channel-sender.interface";
import type { NotificationsService } from "../notifications.service";
import type { ChannelDeliveryJobData } from "../processors/channel-delivery-job";
import type { NotificationDeliveryAttemptRepository } from "../repositories/notification-delivery-attempt.repository";
import type { NotificationRepository } from "../repositories/notification.repository";
import type { Notification } from "@prisma/client";

import { PermanentDeliveryError } from "@/infra/queue/qstash/permanent-delivery-error";

function buildNotification(overrides: Partial<Notification> = {}): Notification {
  return { id: "notification-1", userId: "user-1", ...overrides } as Notification;
}

function buildJobData(overrides: Partial<ChannelDeliveryJobData> = {}): ChannelDeliveryJobData {
  return {
    notificationId: "notification-1",
    deliveryAttemptId: "attempt-1",
    canal: "PUSH",
    ...overrides,
  };
}

describe("NotificationDeliveryRunnerService", () => {
  let notificationRepository: jest.Mocked<NotificationRepository>;
  let deliveryAttemptRepository: jest.Mocked<NotificationDeliveryAttemptRepository>;
  let channelRegistry: jest.Mocked<Pick<ChannelRegistryService, "getSender">>;
  let notificationsService: jest.Mocked<Pick<NotificationsService, "escalateToFallback">>;
  let sender: jest.Mocked<ChannelSender>;
  let runner: NotificationDeliveryRunnerService;

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
    sender = { channel: "PUSH", send: jest.fn() };
    channelRegistry = { getSender: jest.fn().mockReturnValue(sender) };
    notificationsService = { escalateToFallback: jest.fn().mockResolvedValue(undefined) };

    runner = new NotificationDeliveryRunnerService(
      notificationRepository,
      deliveryAttemptRepository,
      channelRegistry as unknown as ChannelRegistryService,
      notificationsService as unknown as NotificationsService,
    );
  });

  describe("run", () => {
    it("lança PermanentDeliveryError quando a notificação não existe mais", async () => {
      notificationRepository.findByIdInternal.mockResolvedValue(null);
      await expect(runner.run(buildJobData())).rejects.toThrow(PermanentDeliveryError);
    });

    it("em sucesso, marca ENVIADA (e ENTREGUE quando o provedor confirma entrega imediata)", async () => {
      notificationRepository.findByIdInternal.mockResolvedValue(buildNotification());
      sender.send.mockResolvedValue({ provedor: "fcm", entregueImediatamente: true });

      await runner.run(buildJobData());

      expect(deliveryAttemptRepository.update).toHaveBeenCalledWith(
        "attempt-1",
        expect.objectContaining({
          status: "ENVIADA",
          provedor: "fcm",
          entregueEm: expect.any(Date),
        }),
      );
    });

    it("em sucesso sem entrega imediata, não grava entregueEm", async () => {
      notificationRepository.findByIdInternal.mockResolvedValue(buildNotification());
      sender.send.mockResolvedValue({ provedor: "whatsapp", entregueImediatamente: false });

      await runner.run(buildJobData());

      const chamada = deliveryAttemptRepository.update.mock.calls[0]?.[1];
      expect(chamada?.entregueEm).toBeUndefined();
    });

    it("em falha de infraestrutura, marca FALHOU e repropaga o erro original (para o retry do QStash)", async () => {
      notificationRepository.findByIdInternal.mockResolvedValue(buildNotification());
      const erroDeRede = new Error("timeout");
      sender.send.mockRejectedValue(erroDeRede);

      await expect(runner.run(buildJobData())).rejects.toBe(erroDeRede);
      expect(deliveryAttemptRepository.update).toHaveBeenCalledWith(
        "attempt-1",
        expect.objectContaining({ status: "FALHOU", erro: "timeout" }),
      );
    });

    it("NotImplementedException vira falha PERMANENTE (PermanentDeliveryError) — nenhum retry resolve um canal sem provedor", async () => {
      notificationRepository.findByIdInternal.mockResolvedValue(buildNotification());
      class NotImplementedException extends Error {
        constructor(message: string) {
          super(message);
          this.name = "NotImplementedException";
        }
      }
      sender.send.mockRejectedValue(new NotImplementedException("canal ainda stub"));

      await expect(runner.run(buildJobData())).rejects.toThrow(PermanentDeliveryError);
    });
  });

  describe("handlePermanentFailure", () => {
    it("delega para NotificationsService.escalateToFallback", async () => {
      await runner.handlePermanentFailure(buildJobData({ canal: "PUSH" }));
      expect(notificationsService.escalateToFallback).toHaveBeenCalledWith(
        "notification-1",
        "PUSH",
      );
    });

    it("nunca lança, mesmo quando a escalação falha (não pode derrubar a resposta ao QStash)", async () => {
      notificationsService.escalateToFallback.mockRejectedValue(new Error("falha ao escalar"));
      await expect(runner.handlePermanentFailure(buildJobData())).resolves.toBeUndefined();
    });
  });

  describe("logFailure", () => {
    it("nunca lança, mesmo com data undefined", () => {
      expect(() => runner.logFailure(undefined, new Error("x"))).not.toThrow();
    });
  });
});
