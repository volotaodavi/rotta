import { createHmac } from "node:crypto";

import { UnauthorizedException } from "@nestjs/common";

import { DiditWebhookGuard } from "../didit-webhook.guard";

import type { DiditConfig } from "@/config/didit.config";
import type { RedisService } from "@/infra/cache/redis.service";
import type { ExecutionContext } from "@nestjs/common";
import type { ConfigService } from "@nestjs/config";

function buildContext(request: unknown): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

function buildConfigService(config: DiditConfig): ConfigService {
  return { get: () => config } as unknown as ConfigService;
}

/** `RedisService` mockado — por padrão sem segredo em cache (o fallback de `DiditWebhookProvisioningService`, testado só quando um caso pede explicitamente). */
function buildRedis(cachedSecret: string | null = null): jest.Mocked<RedisService> {
  return {
    get: jest.fn().mockResolvedValue(cachedSecret),
    set: jest.fn(),
    invalidate: jest.fn(),
    getOrSet: jest.fn(),
  } as unknown as jest.Mocked<RedisService>;
}

/** Reordena chaves alfabeticamente antes de assinar — mesmo `sort_keys=True` que a Didit usa e que o guard desfaz do lado de cá (`sortKeys`). */
function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value !== null && typeof value === "object") {
    return Object.keys(value)
      .sort()
      .reduce<Record<string, unknown>>((acc, key) => {
        acc[key] = sortKeys((value as Record<string, unknown>)[key]);
        return acc;
      }, {});
  }
  return value;
}

/** Mesma serialização canônica que o guard usa para assinar — chaves ordenadas, sem floats fracionários nos testes. */
function sign(secret: string, body: unknown): string {
  return createHmac("sha256", secret)
    .update(JSON.stringify(sortKeys(body)), "utf8")
    .digest("hex");
}

describe("DiditWebhookGuard", () => {
  const config: DiditConfig = {
    apiKey: "didit_test_key",
    baseUrl: "https://verification.didit.me",
    webhookSecret: "meu-segredo-didit",
    workflowId: "workflow-1",
    apiPublicUrl: "https://api.rotta.com.br",
  };

  const now = () => Math.floor(Date.now() / 1000);

  it("recusa quando nenhum segredo está disponível (nem env var, nem Redis)", async () => {
    const guard = new DiditWebhookGuard(
      buildConfigService({ ...config, webhookSecret: undefined }),
      buildRedis(null),
    );
    await expect(guard.canActivate(buildContext({ headers: {}, body: {} }))).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it("usa o segredo auto-registrado no Redis quando DIDIT_WEBHOOK_SECRET não está configurado", async () => {
    const secret = "segredo-auto-registrado";
    const guard = new DiditWebhookGuard(
      buildConfigService({ ...config, webhookSecret: undefined }),
      buildRedis(secret),
    );
    const body = { event_id: "evt_1", webhook_type: "status.updated" };
    const request = {
      headers: { "x-timestamp": String(now()), "x-signature-v2": sign(secret, body) },
      body,
    };
    await expect(guard.canActivate(buildContext(request))).resolves.toBe(true);
  });

  it("recusa quando faltam os headers X-Timestamp/X-Signature-V2", async () => {
    const guard = new DiditWebhookGuard(buildConfigService(config), buildRedis());
    const request = { headers: {}, body: { event_id: "evt_1" } };
    await expect(guard.canActivate(buildContext(request))).rejects.toThrow(UnauthorizedException);
  });

  it("recusa quando X-Timestamp está fora da janela de 300s", async () => {
    const guard = new DiditWebhookGuard(buildConfigService(config), buildRedis());
    const body = { event_id: "evt_1", webhook_type: "status.updated" };
    const staleTimestamp = String(now() - 600);
    const request = {
      headers: {
        "x-timestamp": staleTimestamp,
        "x-signature-v2": sign(config.webhookSecret!, body),
      },
      body,
    };
    await expect(guard.canActivate(buildContext(request))).rejects.toThrow(UnauthorizedException);
  });

  it("recusa quando a assinatura X-Signature-V2 não bate", async () => {
    const guard = new DiditWebhookGuard(buildConfigService(config), buildRedis());
    const body = { event_id: "evt_1", webhook_type: "status.updated" };
    const request = {
      headers: {
        "x-timestamp": String(now()),
        "x-signature-v2": "assinatura-forjada",
      },
      body,
    };
    await expect(guard.canActivate(buildContext(request))).rejects.toThrow(UnauthorizedException);
  });

  it("libera quando timestamp e assinatura X-Signature-V2 são válidos", async () => {
    const guard = new DiditWebhookGuard(buildConfigService(config), buildRedis());
    const body = {
      webhook_type: "status.updated",
      event_id: "evt_1",
      status: "Approved",
      session_id: "sess_1",
    };
    const request = {
      headers: {
        "x-timestamp": String(now()),
        "x-signature-v2": sign(config.webhookSecret!, body),
      },
      body,
    };
    await expect(guard.canActivate(buildContext(request))).resolves.toBe(true);
  });

  it("libera mesmo com a ordem de chaves do corpo diferente da assinada (canonicalização)", async () => {
    const guard = new DiditWebhookGuard(buildConfigService(config), buildRedis());
    const canonicalBody = { event_id: "evt_2", status: "Approved", webhook_type: "status.updated" };
    // Express entrega o corpo com a ordem de inserção original do JSON recebido, não necessariamente ordenada.
    const receivedBody = { webhook_type: "status.updated", event_id: "evt_2", status: "Approved" };
    const request = {
      headers: {
        "x-timestamp": String(now()),
        "x-signature-v2": sign(config.webhookSecret!, canonicalBody),
      },
      body: receivedBody,
    };
    await expect(guard.canActivate(buildContext(request))).resolves.toBe(true);
  });
});
