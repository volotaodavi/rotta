import { NotFoundException } from "@nestjs/common";

import { NotificationInboxService } from "../notification-inbox.service";

import type { DeviceTokenRepository } from "../repositories/device-token.repository";
import type { NotificationPreferenceRepository } from "../repositories/notification-preference.repository";
import type { NotificationRepository } from "../repositories/notification.repository";
import type { AuditLogService } from "@/modules/audit/audit-log.service";
import type { Notification } from "@prisma/client";

function buildNotification(overrides: Partial<Notification> = {}): Notification {
  return {
    id: "notification-1",
    userId: "user-1",
    companyId: null,
    tipo: "NOVO_ALUNO",
    titulo: "Novo aluno",
    corpo: "Pedro foi cadastrado.",
    prioridade: "INFORMATIVA",
    dadosContexto: null,
    canaisEscolhidos: ["IN_APP"],
    lida: false,
    lidaEm: null,
    favoritada: false,
    arquivada: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe("NotificationInboxService", () => {
  let notificationRepository: jest.Mocked<NotificationRepository>;
  let deviceTokenRepository: jest.Mocked<DeviceTokenRepository>;
  let preferenceRepository: jest.Mocked<NotificationPreferenceRepository>;
  let auditLogService: jest.Mocked<Pick<AuditLogService, "record">>;
  let service: NotificationInboxService;

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
    deviceTokenRepository = {
      upsertByToken: jest.fn(),
      listActiveByUser: jest.fn(),
      deactivate: jest.fn(),
    };
    preferenceRepository = { findByUser: jest.fn(), upsert: jest.fn() };
    auditLogService = { record: jest.fn().mockResolvedValue(undefined) };

    service = new NotificationInboxService(
      notificationRepository,
      deviceTokenRepository,
      preferenceRepository,
      auditLogService as unknown as AuditLogService,
    );
  });

  describe("list/findByIdOrThrow", () => {
    it("list repassa userId + filtro para o repositório", async () => {
      notificationRepository.list.mockResolvedValue({ items: [], total: 0 });
      await service.list("user-1", { page: 1, pageSize: 20 });
      expect(notificationRepository.list).toHaveBeenCalledWith({
        page: 1,
        pageSize: 20,
        userId: "user-1",
      });
    });

    it("findByIdOrThrow lança 404 quando não encontra (nunca 403)", async () => {
      notificationRepository.findByIdForUser.mockResolvedValue(null);
      await expect(service.findByIdOrThrow("notification-1", "user-1")).rejects.toThrow(
        NotFoundException,
      );
    });

    it("findByIdOrThrow retorna a notificação quando encontrada", async () => {
      const notification = buildNotification();
      notificationRepository.findByIdForUser.mockResolvedValue(notification);
      await expect(service.findByIdOrThrow("notification-1", "user-1")).resolves.toBe(notification);
    });
  });

  describe("toggles (nunca auditados)", () => {
    it("markRead/markAllRead/setFavorita/setArquivada repassam ao repositório sem tocar em auditoria", async () => {
      notificationRepository.markRead.mockResolvedValue(buildNotification({ lida: true }));
      notificationRepository.markAllRead.mockResolvedValue(3);
      notificationRepository.setFavorita.mockResolvedValue(buildNotification({ favoritada: true }));
      notificationRepository.setArquivada.mockResolvedValue(buildNotification({ arquivada: true }));

      await service.markRead("notification-1", "user-1");
      await service.markAllRead("user-1");
      await service.setFavorita("notification-1", "user-1", true);
      await service.setArquivada("notification-1", "user-1", true);

      expect(auditLogService.record).not.toHaveBeenCalled();
    });

    it("markAllRead retorna a contagem em um objeto", async () => {
      notificationRepository.markAllRead.mockResolvedValue(5);
      await expect(service.markAllRead("user-1")).resolves.toEqual({ count: 5 });
    });
  });

  describe("delete", () => {
    it("exclui e audita NOTIFICATION_DELETED, sempre sem companyId", async () => {
      const notification = buildNotification({ companyId: "company-1" });
      notificationRepository.delete.mockResolvedValue(undefined);

      await service.delete(notification, "user-1");

      expect(notificationRepository.delete).toHaveBeenCalledWith("notification-1", "user-1");
      expect(auditLogService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          entidadeTipo: "Notification",
          entidadeId: "notification-1",
          acao: "NOTIFICATION_DELETED",
          atorUserId: "user-1",
          dadosAntes: { tipo: "NOVO_ALUNO", titulo: "Novo aluno" },
        }),
      );
      expect(auditLogService.record).toHaveBeenCalledWith(
        expect.not.objectContaining({ companyId: expect.anything() }),
      );
    });

    it("delete nunca falha quando a auditoria falha (best-effort)", async () => {
      notificationRepository.delete.mockResolvedValue(undefined);
      auditLogService.record.mockRejectedValue(new Error("db indisponível"));

      await expect(service.delete(buildNotification(), "user-1")).resolves.toBeUndefined();
    });
  });

  describe("device tokens", () => {
    it("registerDeviceToken faz upsert por token", async () => {
      deviceTokenRepository.upsertByToken.mockResolvedValue({} as never);
      await service.registerDeviceToken("user-1", "token-abc", "ANDROID");
      expect(deviceTokenRepository.upsertByToken).toHaveBeenCalledWith({
        userId: "user-1",
        token: "token-abc",
        plataforma: "ANDROID",
      });
    });

    it("deactivateDeviceToken repassa ao repositório", async () => {
      await service.deactivateDeviceToken("token-abc");
      expect(deviceTokenRepository.deactivate).toHaveBeenCalledWith("token-abc");
    });
  });

  describe("preferência", () => {
    it("getPreference retorna defaults (tudo habilitado, sem Quiet Hours) quando o usuário nunca configurou", async () => {
      preferenceRepository.findByUser.mockResolvedValue(null);
      await expect(service.getPreference("user-1")).resolves.toEqual({
        userId: "user-1",
        receberPush: true,
        receberWhatsapp: true,
        receberSms: true,
        receberEmail: true,
        silenciarFinsDeSemana: false,
        quietHoursInicio: null,
        quietHoursFim: null,
      });
    });

    it("getPreference retorna a preferência real quando já existe", async () => {
      const existing = { userId: "user-1", receberPush: false } as never;
      preferenceRepository.findByUser.mockResolvedValue(existing);
      await expect(service.getPreference("user-1")).resolves.toBe(existing);
    });

    it("updatePreference faz upsert e audita NOTIFICATION_PREFERENCE_UPDATED", async () => {
      const updated = { userId: "user-1", receberWhatsapp: false } as never;
      preferenceRepository.upsert.mockResolvedValue(updated);

      const resultado = await service.updatePreference("user-1", { receberWhatsapp: false });

      expect(preferenceRepository.upsert).toHaveBeenCalledWith({
        userId: "user-1",
        receberWhatsapp: false,
      });
      expect(auditLogService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          entidadeTipo: "Notification",
          entidadeId: "user-1",
          acao: "NOTIFICATION_PREFERENCE_UPDATED",
          atorUserId: "user-1",
          dadosDepois: { receberWhatsapp: false },
        }),
      );
      expect(resultado).toBe(updated);
    });

    it("updatePreference nunca falha quando a auditoria falha (best-effort)", async () => {
      preferenceRepository.upsert.mockResolvedValue({} as never);
      auditLogService.record.mockRejectedValue(new Error("db indisponível"));

      await expect(service.updatePreference("user-1", {})).resolves.toBeDefined();
    });
  });
});
