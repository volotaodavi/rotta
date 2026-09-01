import { AdminInboxEmailService } from "../admin-inbox-email.service";

import type { EmailService } from "../email.service";

describe("AdminInboxEmailService", () => {
  const originalEnv = process.env.ADMIN_DIGEST_INBOX_EMAILS;
  let emailService: jest.Mocked<Pick<EmailService, "sendEmail">>;
  let service: AdminInboxEmailService;

  beforeEach(() => {
    delete process.env.ADMIN_DIGEST_INBOX_EMAILS;
    emailService = { sendEmail: jest.fn().mockResolvedValue({ ok: true }) };
    service = new AdminInboxEmailService(emailService as unknown as EmailService);
  });

  afterEach(() => {
    if (originalEnv === undefined) delete process.env.ADMIN_DIGEST_INBOX_EMAILS;
    else process.env.ADMIN_DIGEST_INBOX_EMAILS = originalEnv;
  });

  it("sem ADMIN_DIGEST_INBOX_EMAILS, manda pras duas caixas padrão (contato@ e o gmail antigo)", async () => {
    await service.send("Novo cliente cadastrado", "Transportadora Exemplo se cadastrou.");

    expect(emailService.sendEmail).toHaveBeenCalledTimes(2);
    expect(emailService.sendEmail).toHaveBeenCalledWith(
      "contato@rottabr.com.br",
      "Novo cliente cadastrado",
      expect.any(String),
    );
    expect(emailService.sendEmail).toHaveBeenCalledWith(
      "rottadobrasil@gmail.com",
      "Novo cliente cadastrado",
      expect.any(String),
    );
  });

  it("com ADMIN_DIGEST_INBOX_EMAILS configurada, usa só essa lista (trim, ignora vazios)", async () => {
    process.env.ADMIN_DIGEST_INBOX_EMAILS = " ops@rottabr.com.br , financeiro@rottabr.com.br ,,";

    await service.send("Resumo semanal", "...");

    expect(emailService.sendEmail).toHaveBeenCalledTimes(2);
    expect(emailService.sendEmail).toHaveBeenCalledWith(
      "ops@rottabr.com.br",
      "Resumo semanal",
      expect.any(String),
    );
    expect(emailService.sendEmail).toHaveBeenCalledWith(
      "financeiro@rottabr.com.br",
      "Resumo semanal",
      expect.any(String),
    );
  });

  it("nunca lança quando o envio falha pra uma das caixas (best-effort)", async () => {
    emailService.sendEmail.mockRejectedValueOnce(new Error("Resend fora do ar"));

    await expect(service.send("Título", "Corpo")).resolves.toBeUndefined();
  });
});
