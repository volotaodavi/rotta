import { HealthController } from "../health.controller";

import type { RedisService } from "@/infra/cache/redis.service";
import type { PrismaService } from "@/infra/database/prisma.service";
import type { IntegrationHealthService } from "@/infra/observability/integration-health.service";

function buildPrismaMock(dbOk: boolean): jest.Mocked<PrismaService> {
  return {
    $queryRaw: dbOk
      ? jest.fn().mockResolvedValue([{ 1: 1 }])
      : jest.fn().mockRejectedValue(new Error("db down")),
  } as unknown as jest.Mocked<PrismaService>;
}

function buildRedisMock(cacheOk: boolean): jest.Mocked<RedisService> {
  return {
    set: cacheOk
      ? jest.fn().mockResolvedValue(undefined)
      : jest.fn().mockRejectedValue(new Error("redis down")),
  } as unknown as jest.Mocked<RedisService>;
}

describe("HealthController (Dossiê 44 — Integration & Intelligence Audit Engine)", () => {
  describe("liveness", () => {
    it("sempre retorna ok, sem checar nada", () => {
      const controller = new HealthController(
        buildPrismaMock(false),
        buildRedisMock(false),
        {} as IntegrationHealthService,
      );

      expect(controller.liveness()).toEqual({ status: "ok" });
    });
  });

  describe("readiness", () => {
    it("retorna 'ok' quando Postgres e Redis respondem", async () => {
      const controller = new HealthController(
        buildPrismaMock(true),
        buildRedisMock(true),
        {} as IntegrationHealthService,
      );

      await expect(controller.readiness()).resolves.toEqual({
        status: "ok",
        database: true,
        cache: true,
      });
    });

    it("retorna 'degraded' quando o Postgres falha", async () => {
      const controller = new HealthController(
        buildPrismaMock(false),
        buildRedisMock(true),
        {} as IntegrationHealthService,
      );

      await expect(controller.readiness()).resolves.toEqual({
        status: "degraded",
        database: false,
        cache: true,
      });
    });
  });

  describe("integrations", () => {
    it("retorna status 'ok' e score 100 quando tudo está saudável", async () => {
      const integrationHealth = {
        getAllSnapshots: jest.fn().mockResolvedValue([
          {
            integration: "abacatepay",
            status: "healthy",
            lastSuccessAt: "2026-08-11T12:00:00.000Z",
            lastFailureAt: null,
            lastError: null,
            lastLatencyMs: 80,
            consecutiveFailures: 0,
          },
        ]),
      } as unknown as jest.Mocked<IntegrationHealthService>;

      const controller = new HealthController(
        buildPrismaMock(true),
        buildRedisMock(true),
        integrationHealth,
      );

      const result = await controller.integrations();

      expect(result.status).toBe("ok");
      expect(result.database).toBe(true);
      expect(result.cache).toBe(true);
      expect(result.score).toEqual({
        value: 100,
        consideredComponents: 3,
        healthyComponents: 3,
        note: "Score calculado sobre todos os componentes monitorados (Postgres, Redis e integrações com pelo menos uma chamada real registrada).",
      });
    });

    it("retorna 'down' quando alguma integração está down, mesmo com DB/Redis ok", async () => {
      const integrationHealth = {
        getAllSnapshots: jest.fn().mockResolvedValue([
          {
            integration: "lytex",
            status: "down",
            lastSuccessAt: null,
            lastFailureAt: "2026-08-11T12:00:00.000Z",
            lastError: "erro",
            lastLatencyMs: null,
            consecutiveFailures: 3,
          },
        ]),
      } as unknown as jest.Mocked<IntegrationHealthService>;

      const controller = new HealthController(
        buildPrismaMock(true),
        buildRedisMock(true),
        integrationHealth,
      );
      const result = await controller.integrations();

      expect(result.status).toBe("down");
      expect(result.score.value).toBe(67); // (1 + 1 + 0) / 3 ≈ 66.7% arredondado
    });

    it("exclui integrações 'not_configured'/'unknown' do score, mas as lista em integrations", async () => {
      const integrationHealth = {
        getAllSnapshots: jest.fn().mockResolvedValue([
          {
            integration: "abacatepay",
            status: "healthy",
            lastSuccessAt: "2026-08-11T12:00:00.000Z",
            lastFailureAt: null,
            lastError: null,
            lastLatencyMs: 80,
            consecutiveFailures: 0,
          },
          {
            integration: "lytex",
            status: "not_configured",
            lastSuccessAt: null,
            lastFailureAt: null,
            lastError: "credenciais ausentes",
            lastLatencyMs: null,
            consecutiveFailures: 0,
          },
          {
            integration: "osrm",
            status: "unknown",
            lastSuccessAt: null,
            lastFailureAt: null,
            lastError: null,
            lastLatencyMs: null,
            consecutiveFailures: 0,
          },
        ]),
      } as unknown as jest.Mocked<IntegrationHealthService>;

      const controller = new HealthController(
        buildPrismaMock(true),
        buildRedisMock(true),
        integrationHealth,
      );
      const result = await controller.integrations();

      expect(result.integrations).toHaveLength(3);
      expect(result.score.consideredComponents).toBe(3); // database + cache + abacatepay (healthy)
      expect(result.score.value).toBe(100);
      expect(result.score.note).toContain("excluída(s) do score");
    });
  });
});
