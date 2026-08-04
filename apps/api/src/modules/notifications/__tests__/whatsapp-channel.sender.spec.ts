import { NotFoundException } from "@nestjs/common";
import { CommunicationChannel } from "@prisma/client";

import { WhatsappChannelSender } from "../channels/whatsapp-channel.sender";

import type { WhatsAppService } from "@/infra/whatsapp/whatsapp.service";
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

describe("WhatsappChannelSender", () => {
  let whatsAppService: jest.Mocked<Pick<WhatsAppService, "sendMessage">>;
  let usersService: jest.Mocked<Pick<UsersService, "findById">>;
  let sender: WhatsappChannelSender;

  beforeEach(() => {
    whatsAppService = { sendMessage: jest.fn() };
    usersService = { findById: jest.fn() };
    sender = new WhatsappChannelSender(
      whatsAppService as unknown as WhatsAppService,
      usersService as unknown as UsersService,
    );
  });

  it("canal é WHATSAPP", () => {
    expect(sender.channel).toBe(CommunicationChannel.WHATSAPP);
  });

  it("lança NotFoundException quando o usuário destinatário não existe mais", async () => {
    usersService.findById.mockResolvedValue(null);
    await expect(sender.send({ notification: buildNotification() })).rejects.toThrow(
      NotFoundException,
    );
    expect(whatsAppService.sendMessage).not.toHaveBeenCalled();
  });

  it("envia para o telefone cadastrado do usuário, titulo+corpo concatenados", async () => {
    usersService.findById.mockResolvedValue(buildUser());
    whatsAppService.sendMessage.mockResolvedValue({} as never);

    const resultado = await sender.send({ notification: buildNotification() });

    expect(whatsAppService.sendMessage).toHaveBeenCalledWith("11999998888", "Título\nCorpo");
    expect(resultado).toEqual({ provedor: "whatsapp", entregueImediatamente: false });
  });
});
