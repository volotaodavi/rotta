import { PasswordResetNotifierService } from "../password-reset-notifier.service";

import type { EmailService } from "@/infra/email/email.service";

describe("PasswordResetNotifierService", () => {
  let emailService: jest.Mocked<EmailService>;
  let service: PasswordResetNotifierService;

  beforeEach(() => {
    delete process.env.WEB_APP_URL;
    emailService = {
      sendEmail: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<EmailService>;
    service = new PasswordResetNotifierService(emailService);
  });

  it("envia e-mail com link clicável quando WEB_APP_URL está configurada", async () => {
    process.env.WEB_APP_URL = "https://app.rotta.com.br";

    await service.notify("joao@example.com", "token-abc");

    expect(emailService.sendEmail).toHaveBeenCalledTimes(1);
    const [to, subject, html] = emailService.sendEmail.mock.calls[0]!;
    expect(to).toBe("joao@example.com");
    expect(subject).toContain("Redefinição de senha");
    expect(html).toContain("https://app.rotta.com.br/redefinir-senha?token=token-abc");
  });

  it("ainda envia o e-mail (só sem link) quando WEB_APP_URL não está configurada", async () => {
    await service.notify("joao@example.com", "token-abc");

    expect(emailService.sendEmail).toHaveBeenCalledTimes(1);
    const [, , html] = emailService.sendEmail.mock.calls[0]!;
    expect(html).toContain("token-abc");
    expect(html).not.toContain("redefinir-senha?token=");
  });

  it("nunca propaga o erro quando o envio falha (resposta genérica do AuthService não pode vazar a diferença)", async () => {
    emailService.sendEmail.mockRejectedValueOnce(new Error("Resend fora do ar"));

    await expect(service.notify("joao@example.com", "token-abc")).resolves.toBeUndefined();
  });
});
