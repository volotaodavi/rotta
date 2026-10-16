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

    await service.notify("joao@example.com", "token-abc", 30);

    expect(emailService.sendEmail).toHaveBeenCalledTimes(1);
    const [to, subject, html] = emailService.sendEmail.mock.calls[0]!;
    expect(to).toBe("joao@example.com");
    expect(subject).toContain("Redefinição de senha");
    expect(html).toContain("https://app.rotta.com.br/redefinir-senha?token=token-abc");
  });

  it("ainda envia o e-mail (só sem link) quando WEB_APP_URL não está configurada", async () => {
    await service.notify("joao@example.com", "token-abc", 30);

    expect(emailService.sendEmail).toHaveBeenCalledTimes(1);
    const [, , html] = emailService.sendEmail.mock.calls[0]!;
    expect(html).toContain("token-abc");
    expect(html).not.toContain("redefinir-senha?token=");
  });

  it('escreve o prazo real do link, e não "expira em breve"', async () => {
    /*
      Quem abre o e-mail no fim do dia precisa saber se ainda vale.
      O número vem de quem criou o token, nunca escrito no texto: na
      primeira vez que alguém mudasse o TTL, o e-mail passaria a
      mentir.
    */
    await service.notify("joao@example.com", "token-abc", 30);

    const [, , html] = emailService.sendEmail.mock.calls[0]!;
    expect(html).toContain("vale por 30 minutos");
    expect(html).not.toContain("expira em breve");
  });

  it("escreve hora, e não 60 minutos, quando o prazo é de uma hora", async () => {
    await service.notify("joao@example.com", "token-abc", 60);

    const [, , html] = emailService.sendEmail.mock.calls[0]!;
    expect(html).toContain("vale por 1 hora");
  });

  it("nunca propaga o erro quando o envio falha (resposta genérica do AuthService não pode vazar a diferença)", async () => {
    emailService.sendEmail.mockRejectedValueOnce(new Error("Resend fora do ar"));

    await expect(service.notify("joao@example.com", "token-abc", 30)).resolves.toBeUndefined();
  });
});
