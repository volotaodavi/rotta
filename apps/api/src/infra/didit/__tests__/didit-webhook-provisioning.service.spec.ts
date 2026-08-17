import {
  DiditWebhookProvisioningService,
  WEBHOOK_SECRET_KEY,
} from "../didit-webhook-provisioning.service";

import type { DiditService } from "../didit.service";
import type { AppConfig } from "@/config/app.config";
import type { DiditConfig } from "@/config/didit.config";
import type { RedisService } from "@/infra/cache/redis.service";
import type { ConfigService } from "@nestjs/config";

const DIDIT_CONFIG: DiditConfig = {
  apiKey: "test-key",
  baseUrl: "https://verification.didit.me",
  webhookSecret: undefined,
  workflowIdMotorista: "workflow-motorista",
  workflowIdMonitor: "workflow-monitor",
  apiPublicUrl: "https://api.rotta.com.br",
};

const APP_CONFIG: AppConfig = {
  nodeEnv: "test",
  port: 3333,
  apiPrefix: "v1",
  corsOrigins: [],
  corsOriginRegex: undefined,
};

function buildConfigService(overrides: Partial<DiditConfig> = {}): ConfigService {
  const config: Record<string, unknown> = {
    didit: { ...DIDIT_CONFIG, ...overrides },
    app: APP_CONFIG,
  };
  return { get: (key: string) => config[key] } as unknown as ConfigService;
}

function buildDiditMock(): jest.Mocked<DiditService> {
  return {
    listWebhookDestinations: jest.fn(),
    createWebhookDestination: jest.fn(),
  } as unknown as jest.Mocked<DiditService>;
}

function buildRedisMock(): jest.Mocked<RedisService> {
  return {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(undefined),
    invalidate: jest.fn(),
    getOrSet: jest.fn(),
  } as unknown as jest.Mocked<RedisService>;
}

describe("DiditWebhookProvisioningService", () => {
  it("não faz nada sem DIDIT_API_KEY", async () => {
    const didit = buildDiditMock();
    const service = new DiditWebhookProvisioningService(
      buildConfigService({ apiKey: undefined }),
      didit,
      buildRedisMock(),
    );

    await service.onModuleInit();

    expect(didit.listWebhookDestinations).not.toHaveBeenCalled();
  });

  it("não faz nada sem API_PUBLIC_URL", async () => {
    const didit = buildDiditMock();
    const service = new DiditWebhookProvisioningService(
      buildConfigService({ apiPublicUrl: undefined }),
      didit,
      buildRedisMock(),
    );

    await service.onModuleInit();

    expect(didit.listWebhookDestinations).not.toHaveBeenCalled();
  });

  it("respeita DIDIT_WEBHOOK_SECRET já configurado manualmente, sem chamar a Didit", async () => {
    const didit = buildDiditMock();
    const service = new DiditWebhookProvisioningService(
      buildConfigService({ webhookSecret: "segredo-manual" }),
      didit,
      buildRedisMock(),
    );

    await service.onModuleInit();

    expect(didit.listWebhookDestinations).not.toHaveBeenCalled();
  });

  it("não faz nada quando já existe um segredo em cache no Redis", async () => {
    const didit = buildDiditMock();
    const redis = buildRedisMock();
    redis.get.mockResolvedValue("segredo-em-cache");
    const service = new DiditWebhookProvisioningService(buildConfigService(), didit, redis);

    await service.onModuleInit();

    expect(didit.listWebhookDestinations).not.toHaveBeenCalled();
  });

  it("cria o destino e salva o segredo no Redis quando nenhum destino existe ainda", async () => {
    const didit = buildDiditMock();
    didit.listWebhookDestinations.mockResolvedValue([]);
    didit.createWebhookDestination.mockResolvedValue({ id: "dest_1", secret: "segredo-novo" });
    const redis = buildRedisMock();
    const service = new DiditWebhookProvisioningService(buildConfigService(), didit, redis);

    await service.onModuleInit();

    expect(didit.createWebhookDestination).toHaveBeenCalledWith(
      "https://api.rotta.com.br/v1/webhooks/didit",
      ["status.updated"],
      expect.any(String),
    );
    expect(redis.set).toHaveBeenCalledWith(WEBHOOK_SECRET_KEY, "segredo-novo");
  });

  it("não cria um destino duplicado quando um já aponta para a nossa URL, e loga sem lançar", async () => {
    const didit = buildDiditMock();
    didit.listWebhookDestinations.mockResolvedValue([
      { id: "dest_existente", url: "https://api.rotta.com.br/v1/webhooks/didit" },
    ]);
    const redis = buildRedisMock();
    const service = new DiditWebhookProvisioningService(buildConfigService(), didit, redis);

    await service.onModuleInit();

    expect(didit.createWebhookDestination).not.toHaveBeenCalled();
    expect(redis.set).not.toHaveBeenCalled();
  });

  it("nunca lança — qualquer falha da Didit só é logada", async () => {
    const didit = buildDiditMock();
    didit.listWebhookDestinations.mockRejectedValue(new Error("HTTP 500"));
    const service = new DiditWebhookProvisioningService(
      buildConfigService(),
      didit,
      buildRedisMock(),
    );

    await expect(service.onModuleInit()).resolves.toBeUndefined();
  });
});
