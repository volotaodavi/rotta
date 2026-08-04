import { NotFoundException } from "@nestjs/common";
import { CommunicationChannel } from "@prisma/client";

import { SmsChannelSender } from "../channels/sms-channel.sender";

import type { SmsService } from "@/infra/sms/sms.service";
import type { UsersService } from "@/modules/users/users.service";
import type { Notification, User } from "@prisma/client";

function buildNotification(overrides: Partial<Notification> = {}): Notification {
  return {
    id: "notification-1",
    userId: "user-1",
    titulo: "Título",
    corpo: "Corpo",
    ...overrides,
  } as Notification;
}

function buildUser(overrides: Partial<User> = {}): User {
  return { id: "user-1", telefone: "11999998888", email: "user@example.com", ...overrides } as User;
}

describe("SmsChannelSender", () => {
  let smsService: jest.Mocked<Pick<SmsService, "sendMessage">>;
  let usersService: jest.Mocked<Pick<UsersService, "findById">>;
  let sender: SmsChannelSender;

  beforeEach(() => {
    smsService = { sendMessage: jest.fn() };
    usersService = { findById: jest.fn() };
    sender = new SmsChannelSender(
      smsService as unknown as SmsService,
      usersService as unknown as UsersService,
    );
  });

  it("canal é SMS", () => {
    expect(sender.channel).toBe(CommunicationChannel.SMS);
  });

  it("lança NotFoundException quando o usuário destinatário não existe mais", async () => {
    usersService.findById.mockResolvedValue(null);
    await expect(sender.send({ notification: buildNotification() })).rejects.toThrow(
      NotFoundException,
    );
    expect(smsService.sendMessage).not.toHaveBeenCalled();
  });

  it("envia para o telefone cadastrado do usuário, titulo e corpo separados por hífen", async () => {
    usersService.findById.mockResolvedValue(buildUser());
    smsService.sendMessage.mockResolvedValue({} as never);

    const resultado = await sender.send({ notification: buildNotification() });

    expect(smsService.sendMessage).toHaveBeenCalledWith("11999998888", "Título - Corpo");
    expect(resultado).toEqual({ provedor: "sms", entregueImediatamente: false });
  });
});
