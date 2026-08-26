import { NotFoundException } from "@nestjs/common";
import { CommunicationChannel } from "@prisma/client";

import { PushChannelSender } from "../channels/push-channel.sender";

import type { DeviceTokenRepository } from "../repositories/device-token.repository";
import type { ExpoPushService } from "@/infra/push/expo-push.service";
import type { WebPushService } from "@/infra/push/web-push.service";
import type { DeviceToken, Notification } from "@prisma/client";

function buildNotification(overrides: Partial<Notification> = {}): Notification {
  return {
    id: "notification-1",
    userId: "user-1",
    companyId: null,
    tipo: "NOVO_ALUNO",
    prioridade: "INFORMATIVA",
    titulo: "Título",
    corpo: "Corpo",
    dadosContexto: null,
    canaisEscolhidos: ["PUSH"],
    lida: false,
    lidaEm: null,
    favoritada: false,
    arquivada: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function buildDeviceToken(overrides: Partial<DeviceToken> = {}): DeviceToken {
  return {
    id: "token-1",
    userId: "user-1",
    token: "expo-token-1",
    plataforma: "ANDROID",
    ativo: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as DeviceToken;
}

describe("PushChannelSender", () => {
  let deviceTokenRepository: jest.Mocked<DeviceTokenRepository>;
  let expoPushService: jest.Mocked<Pick<ExpoPushService, "sendToTokens">>;
  let webPushService: jest.Mocked<Pick<WebPushService, "sendToTokens">>;
  let sender: PushChannelSender;

  beforeEach(() => {
    deviceTokenRepository = {
      upsertByToken: jest.fn(),
      listActiveByUser: jest.fn(),
      deactivate: jest.fn(),
    };
    expoPushService = { sendToTokens: jest.fn() };
    webPushService = { sendToTokens: jest.fn() };
    sender = new PushChannelSender(
      expoPushService as unknown as ExpoPushService,
      webPushService as unknown as WebPushService,
      deviceTokenRepository,
    );
  });

  it("canal é PUSH", () => {
    expect(sender.channel).toBe(CommunicationChannel.PUSH);
  });

  it("lança NotFoundException quando o usuário não tem nenhum dispositivo ativo", async () => {
    deviceTokenRepository.listActiveByUser.mockResolvedValue([]);
    await expect(sender.send({ notification: buildNotification() })).rejects.toThrow(
      NotFoundException,
    );
    expect(expoPushService.sendToTokens).not.toHaveBeenCalled();
    expect(webPushService.sendToTokens).not.toHaveBeenCalled();
  });

  it("roteia tokens ANDROID/IOS pro ExpoPushService", async () => {
    deviceTokenRepository.listActiveByUser.mockResolvedValue([
      buildDeviceToken({ token: "t1", plataforma: "ANDROID" }),
      buildDeviceToken({ token: "t2", plataforma: "IOS" }),
    ]);
    expoPushService.sendToTokens.mockResolvedValue({ sucesso: ["t1", "t2"], invalidos: [] });

    const resultado = await sender.send({ notification: buildNotification() });

    expect(expoPushService.sendToTokens).toHaveBeenCalledWith(
      ["t1", "t2"],
      "Título",
      "Corpo",
      null,
    );
    expect(webPushService.sendToTokens).not.toHaveBeenCalled();
    expect(resultado).toEqual({ provedor: "expo+webpush", entregueImediatamente: false });
  });

  it("roteia tokens WEB pro WebPushService", async () => {
    deviceTokenRepository.listActiveByUser.mockResolvedValue([
      buildDeviceToken({ token: "sub-1", plataforma: "WEB" }),
    ]);
    webPushService.sendToTokens.mockResolvedValue({ sucesso: ["sub-1"], invalidos: [] });

    await sender.send({ notification: buildNotification() });

    expect(webPushService.sendToTokens).toHaveBeenCalledWith(["sub-1"], "Título", "Corpo", null);
    expect(expoPushService.sendToTokens).not.toHaveBeenCalled();
  });

  it("um usuário com dispositivos mistos (mobile + web) recebe pelos dois provedores", async () => {
    deviceTokenRepository.listActiveByUser.mockResolvedValue([
      buildDeviceToken({ token: "t1", plataforma: "ANDROID" }),
      buildDeviceToken({ token: "sub-1", plataforma: "WEB" }),
    ]);
    expoPushService.sendToTokens.mockResolvedValue({ sucesso: ["t1"], invalidos: [] });
    webPushService.sendToTokens.mockResolvedValue({ sucesso: ["sub-1"], invalidos: [] });

    const resultado = await sender.send({ notification: buildNotification() });

    expect(expoPushService.sendToTokens).toHaveBeenCalledWith(["t1"], "Título", "Corpo", null);
    expect(webPushService.sendToTokens).toHaveBeenCalledWith(["sub-1"], "Título", "Corpo", null);
    expect(resultado.provedor).toBe("expo+webpush");
  });

  it("desativa tokens que o provedor reporta como inválidos", async () => {
    deviceTokenRepository.listActiveByUser.mockResolvedValue([
      buildDeviceToken({ token: "t1" }),
      buildDeviceToken({ token: "t2" }),
    ]);
    expoPushService.sendToTokens.mockResolvedValue({ sucesso: ["t1"], invalidos: ["t2"] });

    await sender.send({ notification: buildNotification() });

    expect(deviceTokenRepository.deactivate).toHaveBeenCalledWith("t2");
    expect(deviceTokenRepository.deactivate).toHaveBeenCalledTimes(1);
  });

  it("lança erro quando todos os tokens falham (nenhum sucesso)", async () => {
    deviceTokenRepository.listActiveByUser.mockResolvedValue([buildDeviceToken({ token: "t1" })]);
    expoPushService.sendToTokens.mockResolvedValue({ sucesso: [], invalidos: ["t1"] });

    await expect(sender.send({ notification: buildNotification() })).rejects.toThrow(Error);
    expect(deviceTokenRepository.deactivate).toHaveBeenCalledWith("t1");
  });
});
