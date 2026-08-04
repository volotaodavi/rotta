import { NotFoundException } from "@nestjs/common";
import { CommunicationChannel } from "@prisma/client";

import { EmailChannelSender } from "../channels/email-channel.sender";

import type { EmailService } from "@/infra/email/email.service";
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

describe("EmailChannelSender", () => {
  let emailService: jest.Mocked<Pick<EmailService, "sendEmail">>;
  let usersService: jest.Mocked<Pick<UsersService, "findById">>;
  let sender: EmailChannelSender;

  beforeEach(() => {
    emailService = { sendEmail: jest.fn() };
    usersService = { findById: jest.fn() };
    sender = new EmailChannelSender(
      emailService as unknown as EmailService,
      usersService as unknown as UsersService,
    );
  });

  it("canal é EMAIL", () => {
    expect(sender.channel).toBe(CommunicationChannel.EMAIL);
  });

  it("lança NotFoundException quando o usuário destinatário não existe mais", async () => {
    usersService.findById.mockResolvedValue(null);
    await expect(sender.send({ notification: buildNotification() })).rejects.toThrow(
      NotFoundException,
    );
    expect(emailService.sendEmail).not.toHaveBeenCalled();
  });

  it("envia para o e-mail cadastrado do usuário com o template HTML responsivo", async () => {
    usersService.findById.mockResolvedValue(buildUser());
    emailService.sendEmail.mockResolvedValue({} as never);

    const resultado = await sender.send({ notification: buildNotification() });

    expect(emailService.sendEmail).toHaveBeenCalledWith(
      "user@example.com",
      "Título",
      expect.stringContaining("Corpo"),
    );
    expect(resultado).toEqual({ provedor: "email", entregueImediatamente: false });
  });
});
