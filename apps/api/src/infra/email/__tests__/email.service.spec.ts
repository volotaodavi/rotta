import { ServiceUnavailableException } from "@nestjs/common";

import { EmailService } from "../email.service";

import type { EmailProvider } from "../email-provider.interface";
import type { EmailConfig } from "@/config/email.config";
import type { ConfigService } from "@nestjs/config";

function buildConfig(overrides: Partial<EmailConfig> = {}): EmailConfig {
  return {
    provider: "resend",
    apiKey: "re_fake_key",
    fromAddress: "notificacoes@rottabr.com.br",
    fromName: "Rotta",
    fromAddressFinanceiro: "financeiro@rottabr.com.br",
    fromNameFinanceiro: "Rotta Financeiro",
    fromAddressSuporte: "suporte@rottabr.com.br",
    fromNameSuporte: "Rotta Suporte",
    ...overrides,
  };
}

function buildConfigService(config: EmailConfig): jest.Mocked<Pick<ConfigService, "get">> {
  return { get: jest.fn().mockReturnValue(config) };
}

describe("EmailService", () => {
  let provider: jest.Mocked<EmailProvider>;

  beforeEach(() => {
    provider = { name: "resend", send: jest.fn().mockResolvedValue({ providerMessageId: "id-1" }) };
  });

  it("sem remetente explícito, resolve pro endereço/nome genérico (notificações)", async () => {
    const service = new EmailService(
      buildConfigService(buildConfig()) as unknown as ConfigService,
      [provider],
    );

    await service.sendEmail("destinatario@example.com", "Assunto", "<p>Corpo</p>");

    expect(provider.send).toHaveBeenCalledWith({
      to: "destinatario@example.com",
      subject: "Assunto",
      html: "<p>Corpo</p>",
      from: { address: "notificacoes@rottabr.com.br", name: "Rotta" },
    });
  });

  it('remetente "financeiro" resolve pro endereço/nome financeiro (pedido do usuário 03/09/2026)', async () => {
    const service = new EmailService(
      buildConfigService(buildConfig()) as unknown as ConfigService,
      [provider],
    );

    await service.sendEmail("destinatario@example.com", "Assunto", "<p>Corpo</p>", "financeiro");

    expect(provider.send).toHaveBeenCalledWith(
      expect.objectContaining({
        from: { address: "financeiro@rottabr.com.br", name: "Rotta Financeiro" },
      }),
    );
  });

  it('remetente "suporte" resolve pro endereço/nome de suporte (pedido do usuário 03/09/2026)', async () => {
    const service = new EmailService(
      buildConfigService(buildConfig()) as unknown as ConfigService,
      [provider],
    );

    await service.sendEmail("destinatario@example.com", "Assunto", "<p>Corpo</p>", "suporte");

    expect(provider.send).toHaveBeenCalledWith(
      expect.objectContaining({
        from: { address: "suporte@rottabr.com.br", name: "Rotta Suporte" },
      }),
    );
  });

  it("respeita remetentes customizados via variável de ambiente (email.config.ts)", async () => {
    const service = new EmailService(
      buildConfigService(
        buildConfig({
          fromAddressFinanceiro: "cobranca@rottabr.com.br",
          fromNameFinanceiro: "Cobrança Rotta",
        }),
      ) as unknown as ConfigService,
      [provider],
    );

    await service.sendEmail("destinatario@example.com", "Assunto", "<p>Corpo</p>", "financeiro");

    expect(provider.send).toHaveBeenCalledWith(
      expect.objectContaining({
        from: { address: "cobranca@rottabr.com.br", name: "Cobrança Rotta" },
      }),
    );
  });

  it("lança erro claro quando EMAIL_PROVIDER aponta pra um provedor não registrado", async () => {
    const service = new EmailService(
      buildConfigService(buildConfig({ provider: "sendgrid" })) as unknown as ConfigService,
      [provider],
    );

    await expect(
      service.sendEmail("destinatario@example.com", "Assunto", "<p>Corpo</p>"),
    ).rejects.toThrow(ServiceUnavailableException);
    expect(provider.send).not.toHaveBeenCalled();
  });
});
