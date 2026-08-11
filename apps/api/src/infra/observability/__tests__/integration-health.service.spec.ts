import { IntegrationHealthService } from "../integration-health.service";

import type { RedisService } from "@/infra/cache/redis.service";

/** Redis falso em memória — suficiente para testar a lógica de `IntegrationHealthService` sem depender de um Redis real (mesmo padrão usado em outros specs deste repositório para dependências externas). */
function buildInMemoryRedis(): jest.Mocked<RedisService> {
  const store = new Map<string, unknown>();
  return {
    get: jest.fn((key: string) =>
      Promise.resolve(store.has(key) ? (store.get(key) as never) : null),
    ),
    set: jest.fn((key: string, value: unknown) => {
      store.set(key, value);
      return Promise.resolve();
    }),
    invalidate: jest.fn((key: string) => {
      store.delete(key);
      return Promise.resolve();
    }),
    getOrSet: jest.fn(),
  } as unknown as jest.Mocked<RedisService>;
}

describe("IntegrationHealthService (Dossiê 44 — Integration & Intelligence Audit Engine)", () => {
  let redis: jest.Mocked<RedisService>;
  let service: IntegrationHealthService;

  beforeEach(() => {
    redis = buildInMemoryRedis();
    service = new IntegrationHealthService(redis);
  });

  describe("getSnapshot", () => {
    it("retorna status 'unknown' quando nenhuma chamada foi registrada ainda", async () => {
      const snapshot = await service.getSnapshot("abacatepay");

      expect(snapshot).toEqual({
        integration: "abacatepay",
        status: "unknown",
        lastSuccessAt: null,
        lastFailureAt: null,
        lastError: null,
        lastLatencyMs: null,
        consecutiveFailures: 0,
      });
    });
  });

  describe("recordSuccess", () => {
    it("marca a integração como 'healthy' e zera falhas consecutivas", async () => {
      await service.recordFailure("nominatim", "timeout");
      await service.recordFailure("nominatim", "timeout");

      await service.recordSuccess("nominatim", 120);
      const snapshot = await service.getSnapshot("nominatim");

      expect(snapshot.status).toBe("healthy");
      expect(snapshot.consecutiveFailures).toBe(0);
      expect(snapshot.lastLatencyMs).toBe(120);
      expect(snapshot.lastError).toBeNull();
      expect(snapshot.lastSuccessAt).not.toBeNull();
    });

    it("preserva o lastFailureAt anterior (histórico), mesmo após um sucesso", async () => {
      await service.recordFailure("osrm", "HTTP 503");
      const afterFailure = await service.getSnapshot("osrm");

      await service.recordSuccess("osrm", 50);
      const afterSuccess = await service.getSnapshot("osrm");

      expect(afterSuccess.lastFailureAt).toBe(afterFailure.lastFailureAt);
    });
  });

  describe("recordFailure", () => {
    it("marca 'degraded' já na 1ª falha consecutiva", async () => {
      await service.recordFailure("lytex", "erro qualquer");
      const snapshot = await service.getSnapshot("lytex");

      expect(snapshot.status).toBe("degraded");
      expect(snapshot.consecutiveFailures).toBe(1);
      expect(snapshot.lastError).toBe("erro qualquer");
    });

    it("marca 'down' a partir da 3ª falha consecutiva", async () => {
      await service.recordFailure("lytex", "erro 1");
      await service.recordFailure("lytex", "erro 2");
      await service.recordFailure("lytex", "erro 3");

      const snapshot = await service.getSnapshot("lytex");
      expect(snapshot.status).toBe("down");
      expect(snapshot.consecutiveFailures).toBe(3);
    });

    it("acumula falhas consecutivas através de múltiplas chamadas", async () => {
      await service.recordFailure("osrm", "erro 1");
      await service.recordFailure("osrm", "erro 2");

      const snapshot = await service.getSnapshot("osrm");
      expect(snapshot.consecutiveFailures).toBe(2);
      expect(snapshot.status).toBe("degraded");
    });
  });

  describe("recordNotConfigured", () => {
    it("marca 'not_configured' sem alterar lastSuccessAt/lastFailureAt/consecutiveFailures", async () => {
      await service.recordFailure("lytex", "erro 1");
      await service.recordNotConfigured("lytex", "LYTEX_CLIENT_ID ausente");

      const snapshot = await service.getSnapshot("lytex");
      expect(snapshot.status).toBe("not_configured");
      expect(snapshot.lastError).toBe("LYTEX_CLIENT_ID ausente");
      // consecutiveFailures/lastFailureAt do estado anterior são preservados —
      // "não configurado" não é nem sucesso nem falha de rede.
      expect(snapshot.consecutiveFailures).toBe(1);
    });
  });

  describe("getAllSnapshots", () => {
    it("retorna um snapshot por integração, na ordem pedida", async () => {
      await service.recordSuccess("abacatepay", 80);
      await service.recordFailure("lytex", "erro");

      const snapshots = await service.getAllSnapshots(["abacatepay", "lytex", "osrm"]);

      expect(snapshots.map((s) => s.integration)).toEqual(["abacatepay", "lytex", "osrm"]);
      expect(snapshots[0]?.status).toBe("healthy");
      expect(snapshots[1]?.status).toBe("degraded");
      expect(snapshots[2]?.status).toBe("unknown");
    });
  });
});
