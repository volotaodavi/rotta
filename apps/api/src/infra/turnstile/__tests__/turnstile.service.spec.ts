import { BadRequestException } from "@nestjs/common";

import { TurnstileService } from "../turnstile.service";

import type { TurnstileConfig } from "@/config/turnstile.config";
import type { ConfigService } from "@nestjs/config";

function jsonResponse(body: unknown, ok = true): Response {
  return { ok, json: () => Promise.resolve(body) } as unknown as Response;
}

function buildConfigServiceMock(secretKey: string | undefined): ConfigService {
  return {
    get: jest.fn().mockReturnValue({ secretKey } satisfies TurnstileConfig),
  } as unknown as ConfigService;
}

describe("TurnstileService", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.resetAllMocks();
  });

  it("pula a verificação (nunca lança) quando TURNSTILE_SECRET_KEY não está configurada, mesmo sem token", async () => {
    const service = new TurnstileService(buildConfigServiceMock(undefined));

    await expect(service.assertHuman(undefined, "1.2.3.4")).resolves.toBeUndefined();
  });

  it("rejeita quando a secret está configurada mas nenhum token foi enviado", async () => {
    const service = new TurnstileService(buildConfigServiceMock("secret-key"));

    await expect(service.assertHuman(undefined, "1.2.3.4")).rejects.toThrow(BadRequestException);
  });

  it("aceita quando a Cloudflare confirma o token (success: true)", async () => {
    global.fetch = jest.fn().mockResolvedValue(jsonResponse({ success: true }));
    const service = new TurnstileService(buildConfigServiceMock("secret-key"));

    await expect(service.assertHuman("token-valido", "1.2.3.4")).resolves.toBeUndefined();
    expect(global.fetch).toHaveBeenCalledWith(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("rejeita quando a Cloudflare recusa o token (success: false)", async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValue(
        jsonResponse({ success: false, "error-codes": ["invalid-input-response"] }),
      );
    const service = new TurnstileService(buildConfigServiceMock("secret-key"));

    await expect(service.assertHuman("token-invalido", "1.2.3.4")).rejects.toThrow(
      BadRequestException,
    );
  });

  it("rejeita (nunca deixa passar) quando a Cloudflare está indisponível", async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error("network down"));
    const service = new TurnstileService(buildConfigServiceMock("secret-key"));

    await expect(service.assertHuman("token", "1.2.3.4")).rejects.toThrow(BadRequestException);
  });
});
