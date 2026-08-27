import { UnauthorizedException } from "@nestjs/common";

import { AsaasWebhookGuard } from "../asaas-webhook.guard";

import type { AsaasConfig } from "@/config/asaas.config";
import type { ExecutionContext } from "@nestjs/common";

function buildContext(request: unknown): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

describe("AsaasWebhookGuard", () => {
  const config: AsaasConfig = {
    apiKey: "asaas_test_key",
    baseUrl: "https://api-sandbox.asaas.com/v3",
    webhookToken: "meu-token-de-webhook",
  };

  it("recusa quando ASAAS_WEBHOOK_TOKEN não está configurado", () => {
    const guard = new AsaasWebhookGuard({ ...config, webhookToken: undefined });
    expect(() => guard.canActivate(buildContext({ headers: {} }))).toThrow(UnauthorizedException);
  });

  it("recusa quando o header asaas-access-token não bate", () => {
    const guard = new AsaasWebhookGuard(config);
    const request = { headers: { "asaas-access-token": "errado" } };
    expect(() => guard.canActivate(buildContext(request))).toThrow(UnauthorizedException);
  });

  it("recusa quando o header está ausente", () => {
    const guard = new AsaasWebhookGuard(config);
    expect(() => guard.canActivate(buildContext({ headers: {} }))).toThrow(UnauthorizedException);
  });

  it("libera quando o header bate com ASAAS_WEBHOOK_TOKEN", () => {
    const guard = new AsaasWebhookGuard(config);
    const request = { headers: { "asaas-access-token": "meu-token-de-webhook" } };
    expect(guard.canActivate(buildContext(request))).toBe(true);
  });
});
