import { AdminInboxEmailService } from "../admin-inbox-email.service";

import type { EmailService } from "../email.service";

const ENV_VARS = [
  "ADMIN_DIGEST_INBOX_EMAILS",
  "FINANCE_DIGEST_INBOX_EMAILS",
  "SUPPORT_DIGEST_INBOX_EMAILS",
] as const;

describe("AdminInboxEmailService", () => {
  const originalEnv: Record<string, string | undefined> = {};
  let emailService: jest.Mocked<Pick<EmailService, "sendEmail">>;
  let service: AdminInboxEmailService;

  beforeEach(() => {
    for (const key of ENV_VARS) {
      originalEnv[key] = process.env[key];
      delete process.env[key];
    }
    emailService = { sendEmail: jest.fn().mockResolvedValue({ ok: true }) };
    service = new AdminInboxEmailService(emailService as unknown as EmailService);
  });

  afterEach(() => {
    for (const key of ENV_VARS) {
      if (originalEnv[key] === undefined) delete process.env[key];
      else process.env[key] = originalEnv[key];
    }
  });

  it('sem categoria ("notificacoes") e sem ADMIN_DIGEST_INBOX_EMAILS, manda pras duas caixas padrão (contato@ e o gmail antigo)', async () => {
    await service.send("Novo cliente cadastrado", "Transportadora Exemplo se cadastrou.");

    expect(emailService.sendEmail).toHaveBeenCalledTimes(2);
    expect(emailService.sendEmail).toHaveBeenCalledWith(
      "contato@rottabr.com.br",
      "Novo cliente cadastrado",
      expect.any(String),
      "notificacoes",
    );
    expect(emailService.sendEmail).toHaveBeenCalledWith(
      "rottadobrasil@gmail.com",
      "Novo cliente cadastrado",
      expect.any(String),
      "notificacoes",
    );
  });

  it('com ADMIN_DIGEST_INBOX_EMAILS configurada, usa só essa lista pra categoria "notificacoes" (trim, ignora vazios)', async () => {
    process.env.ADMIN_DIGEST_INBOX_EMAILS = " ops@rottabr.com.br , outra@rottabr.com.br ,,";

    await service.send("Resumo semanal", "...");

    expect(emailService.sendEmail).toHaveBeenCalledTimes(2);
    expect(emailService.sendEmail).toHaveBeenCalledWith(
      "ops@rottabr.com.br",
      "Resumo semanal",
      expect.any(String),
      "notificacoes",
    );
    expect(emailService.sendEmail).toHaveBeenCalledWith(
      "outra@rottabr.com.br",
      "Resumo semanal",
      expect.any(String),
      "notificacoes",
    );
  });

  it('remetente "financeiro" cai em financeiro@rottabr.com.br (pedido do usuário 07/09/2026: relatório semanal/mensal só pra essa caixa)', async () => {
    await service.send("Nova assinatura", "...", "financeiro");

    expect(emailService.sendEmail).toHaveBeenCalledTimes(1);
    expect(emailService.sendEmail).toHaveBeenCalledWith(
      "financeiro@rottabr.com.br",
      "Nova assinatura",
      expect.any(String),
      "financeiro",
    );
  });

  it('remetente "suporte" cai em suporte@rottabr.com.br', async () => {
    await service.send("Chamado encerrado", "...", "suporte");

    expect(emailService.sendEmail).toHaveBeenCalledTimes(1);
    expect(emailService.sendEmail).toHaveBeenCalledWith(
      "suporte@rottabr.com.br",
      "Chamado encerrado",
      expect.any(String),
      "suporte",
    );
  });

  it("FINANCE_DIGEST_INBOX_EMAILS sobrescreve só a caixa financeiro, sem afetar as outras categorias", async () => {
    process.env.FINANCE_DIGEST_INBOX_EMAILS = "cfo@rottabr.com.br";

    await service.send("Resumo mensal", "...", "financeiro");
    await service.send("Novo cliente cadastrado", "...");

    expect(emailService.sendEmail).toHaveBeenCalledWith(
      "cfo@rottabr.com.br",
      "Resumo mensal",
      expect.any(String),
      "financeiro",
    );
    expect(emailService.sendEmail).toHaveBeenCalledWith(
      "contato@rottabr.com.br",
      "Novo cliente cadastrado",
      expect.any(String),
      "notificacoes",
    );
  });

  it("nunca lança quando o envio falha pra uma das caixas (best-effort)", async () => {
    emailService.sendEmail.mockRejectedValueOnce(new Error("Resend fora do ar"));

    await expect(service.send("Título", "Corpo")).resolves.toBeUndefined();
  });
});
