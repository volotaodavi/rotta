import { createHmac } from "node:crypto";

import { UnauthorizedException } from "@nestjs/common";

import { AbacatePayWebhookGuard } from "../abacatepay-webhook.guard";
import { ABACATEPAY_HMAC_PUBLIC_KEY } from "../billing.constants";

import type { AbacatePayConfig } from "@/config/abacatepay.config";
import type { ExecutionContext } from "@nestjs/common";

function buildContext(request: unknown): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

function sign(body: string): string {
  return createHmac("sha256", ABACATEPAY_HMAC_PUBLIC_KEY)
    .update(Buffer.from(body, "utf8"))
    .digest("base64");
}

describe("AbacatePayWebhookGuard", () => {
  const config: AbacatePayConfig = {
    apiKey: "abc_prod_test",
    baseUrl: "https://api.abacatepay.com/v2",
    webhookSecret: "meu-segredo",
  };

  it("recusa quando ABACATEPAY_WEBHOOK_SECRET não está configurado", () => {
    const guard = new AbacatePayWebhookGuard({ ...config, webhookSecret: undefined });
    expect(() => guard.canActivate(buildContext({ query: {}, headers: {} }))).toThrow(
      UnauthorizedException,
    );
  });

  it("recusa quando o ?webhookSecret= da URL não bate", () => {
    const guard = new AbacatePayWebhookGuard(config);
    const request = { query: { webhookSecret: "errado" }, headers: {}, rawBody: Buffer.from("{}") };
    expect(() => guard.canActivate(buildContext(request))).toThrow(UnauthorizedException);
  });

  it("recusa quando falta o header X-Webhook-Signature", () => {
    const guard = new AbacatePayWebhookGuard(config);
    const request = {
      query: { webhookSecret: "meu-segredo" },
      headers: {},
      rawBody: Buffer.from("{}"),
    };
    expect(() => guard.canActivate(buildContext(request))).toThrow(UnauthorizedException);
  });

  it("recusa quando a assinatura HMAC não bate", () => {
    const guard = new AbacatePayWebhookGuard(config);
    const request = {
      query: { webhookSecret: "meu-segredo" },
      headers: { "x-webhook-signature": "assinatura-forjada" },
      rawBody: Buffer.from('{"event":"subscription.completed"}'),
    };
    expect(() => guard.canActivate(buildContext(request))).toThrow(UnauthorizedException);
  });

  it("libera quando o secret e a assinatura HMAC são válidos", () => {
    const guard = new AbacatePayWebhookGuard(config);
    const body = '{"event":"subscription.completed"}';
    const request = {
      query: { webhookSecret: "meu-segredo" },
      headers: { "x-webhook-signature": sign(body) },
      rawBody: Buffer.from(body, "utf8"),
    };
    expect(guard.canActivate(buildContext(request))).toBe(true);
  });
});
