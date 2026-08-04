import { NotFoundException } from "@nestjs/common";
import { CommunicationChannel } from "@prisma/client";

import { PushChannelSender } from "../channels/push-channel.sender";

import type { DeviceTokenRepository } from "../repositories/device-token.repository";
import type { FcmService } from "@/infra/push/fcm.service";
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
    token: "fcm-token-1",
    plataforma: "ANDROID",
    ativo: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as DeviceToken;
}

describe("PushChannelSender", () => {
  let deviceTokenRepository: jest.Mocked<DeviceTokenRepository>;
  let fcmService: jest.Mocked<Pick<FcmService, "sendToTokens">>;
  let sender: PushChannelSender;

  beforeEach(() => {
    deviceTokenRepository = {
      upsertByToken: jest.fn(),
      listActiveByUser: jest.fn(),
      deactivate: jest.fn(),
    };
    fcmService = { sendToTokens: jest.fn() };
    sender = new PushChannelSender(fcmService as unknown as FcmService, deviceTokenRepository);
  });

  it("canal é PUSH", () => {
    expect(sender.channel).toBe(CommunicationChannel.PUSH);
  });

  it("lança NotFoundException quando o usuário não tem nenhum dispositivo ativo", async () => {
    deviceTokenRepository.listActiveByUser.mockResolvedValue([]);
    await expect(sender.send({ notification: buildNotification() })).rejects.toThrow(
      NotFoundException,
    );
    expect(fcmService.sendToTokens).not.toHaveBeenCalled();
  });

  it("envia para todos os tokens ativos e retorna provedor fcm em sucesso", async () => {
    deviceTokenRepository.listActiveByUser.mockResolvedValue([
      buildDeviceToken({ token: "t1" }),
      buildDeviceToken({ token: "t2" }),
    ]);
    fcmService.sendToTokens.mockResolvedValue({ sucesso: ["t1", "t2"], invalidos: [] });

    const resultado = await sender.send({ notification: buildNotification() });

    expect(fcmService.sendToTokens).toHaveBeenCalledWith(["t1", "t2"], "Título", "Corpo", null);
    expect(resultado).toEqual({ provedor: "fcm", entregueImediatamente: false });
  });

  it("desativa tokens que o FCM reporta como inválidos", async () => {
    deviceTokenRepository.listActiveByUser.mockResolvedValue([
      buildDeviceToken({ token: "t1" }),
      buildDeviceToken({ token: "t2" }),
    ]);
    fcmService.sendToTokens.mockResolvedValue({ sucesso: ["t1"], invalidos: ["t2"] });

    await sender.send({ notification: buildNotification() });

    expect(deviceTokenRepository.deactivate).toHaveBeenCalledWith("t2");
    expect(deviceTokenRepository.deactivate).toHaveBeenCalledTimes(1);
  });

  it("lança erro quando todos os tokens falham (nenhum sucesso)", async () => {
    deviceTokenRepository.listActiveByUser.mockResolvedValue([buildDeviceToken({ token: "t1" })]);
    fcmService.sendToTokens.mockResolvedValue({ sucesso: [], invalidos: ["t1"] });

    await expect(sender.send({ notification: buildNotification() })).rejects.toThrow(Error);
    expect(deviceTokenRepository.deactivate).toHaveBeenCalledWith("t1");
  });
});
