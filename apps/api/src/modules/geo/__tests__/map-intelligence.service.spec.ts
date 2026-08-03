import { MapIntelligenceService } from "../agents/map-intelligence.service";

import type {
  SchoolMarker,
  SchoolMarkerRepository,
} from "../repositories/school-marker.repository";
import type { RedisService } from "@/infra/cache/redis.service";

function buildMarker(overrides: Partial<SchoolMarker> = {}): SchoolMarker {
  return {
    id: "school-1",
    nomeOficial: "EMEF Professora Ana Souza",
    latitude: -23.561684,
    longitude: -46.655981,
    status: "ATIVA",
    ...overrides,
  };
}

/** `RedisService.getOrSet` real (sem mock de cache-hit) — testa a integração service→repository através do cache. */
function buildPassthroughRedis(): jest.Mocked<RedisService> {
  return {
    get: jest.fn(),
    set: jest.fn(),
    invalidate: jest.fn(),
    getOrSet: jest.fn((_key: string, _ttl: number, resolver: () => Promise<unknown>) => resolver()),
  } as unknown as jest.Mocked<RedisService>;
}

describe("MapIntelligenceService", () => {
  describe("listarMarcadores", () => {
    it("delega ao SchoolMarkerRepository.findInBoundingBox com os bounds informados, através do cache", async () => {
      const marker = buildMarker();
      const markerRepository = {
        findInBoundingBox: jest.fn().mockResolvedValue([marker]),
        findNearby: jest.fn(),
      } as unknown as jest.Mocked<SchoolMarkerRepository>;
      const redis = buildPassthroughRedis();
      const service = new MapIntelligenceService(markerRepository, redis);

      const bounds = { swLat: -23.6, swLng: -46.7, neLat: -23.5, neLng: -46.6 };
      const resultado = await service.listarMarcadores(bounds);

      expect(resultado).toEqual([marker]);
      expect(markerRepository.findInBoundingBox).toHaveBeenCalledWith(bounds, 500);
      expect(redis.getOrSet).toHaveBeenCalledWith(
        expect.stringContaining("geo:mapa:marcadores:"),
        60,
        expect.any(Function),
      );
    });

    it("usa a mesma chave de cache para bounds arredondados aos ~100m (pans minúsculos não invalidam o cache)", async () => {
      const markerRepository = {
        findInBoundingBox: jest.fn().mockResolvedValue([]),
        findNearby: jest.fn(),
      } as unknown as jest.Mocked<SchoolMarkerRepository>;
      const redis = buildPassthroughRedis();
      const service = new MapIntelligenceService(markerRepository, redis);

      await service.listarMarcadores({
        swLat: -23.60001,
        swLng: -46.70001,
        neLat: -23.5,
        neLng: -46.6,
      });
      await service.listarMarcadores({
        swLat: -23.60002,
        swLng: -46.70002,
        neLat: -23.5,
        neLng: -46.6,
      });

      const [primeiraChave] = (redis.getOrSet as jest.Mock).mock.calls[0] as [string];
      const [segundaChave] = (redis.getOrSet as jest.Mock).mock.calls[1] as [string];
      expect(primeiraChave).toBe(segundaChave);
    });
  });

  describe("listarProximas", () => {
    it("delega ao SchoolMarkerRepository.findNearby com origem e raio informados, através do cache", async () => {
      const marker = { ...buildMarker(), distanciaMetros: 120 };
      const markerRepository = {
        findInBoundingBox: jest.fn(),
        findNearby: jest.fn().mockResolvedValue([marker]),
      } as unknown as jest.Mocked<SchoolMarkerRepository>;
      const redis = buildPassthroughRedis();
      const service = new MapIntelligenceService(markerRepository, redis);

      const origem = { latitude: -23.561684, longitude: -46.655981 };
      const resultado = await service.listarProximas(origem, 5);

      expect(resultado).toEqual([marker]);
      expect(markerRepository.findNearby).toHaveBeenCalledWith(origem, 5, 500);
    });
  });
});
