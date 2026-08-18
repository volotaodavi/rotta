import { BadGatewayException } from "@nestjs/common";

import { GeoEngineService, NominatimRateLimitedException } from "../geo-engine.service";

import type { GeoConfig } from "@/config/geo.config";
import type { IntegrationHealthService } from "@/infra/observability/integration-health.service";
import type { ConfigService } from "@nestjs/config";

function buildConfigService(overrides: Partial<GeoConfig> = {}): ConfigService {
  const config: GeoConfig = {
    nominatimBaseUrl: "https://nominatim.openstreetmap.org",
    nominatimUserAgent: "RottaGeoPlatform/1.0 (+https://rotta.com.br)",
    osrmBaseUrl: "https://router.project-osrm.org",
    inepSyncCron: undefined,
    inepSyncAno: undefined,
    ...overrides,
  };
  return { get: () => config } as unknown as ConfigService;
}

function buildIntegrationHealthMock(): jest.Mocked<IntegrationHealthService> {
  return {
    recordSuccess: jest.fn().mockResolvedValue(undefined),
    recordFailure: jest.fn().mockResolvedValue(undefined),
    recordNotConfigured: jest.fn().mockResolvedValue(undefined),
    getSnapshot: jest.fn(),
    getAllSnapshots: jest.fn(),
  } as unknown as jest.Mocked<IntegrationHealthService>;
}

function mockFetchOnce(status: number, body: unknown): void {
  global.fetch = jest.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  });
}

describe("GeoEngineService", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("geocode", () => {
    it("converte a resposta do Nominatim /search para o contrato estável do Rotta Geo Engine", async () => {
      mockFetchOnce(200, [
        {
          lat: "-23.561684",
          lon: "-46.655981",
          display_name: "Avenida Paulista, Bela Vista, São Paulo - SP, 01310100, Brasil",
          importance: 0.95,
          address: {
            road: "Avenida Paulista",
            suburb: "Bela Vista",
            city: "São Paulo",
            state: "São Paulo",
            "ISO3166-2-lvl4": "BR-SP",
          },
        },
      ]);

      const service = new GeoEngineService(buildConfigService(), buildIntegrationHealthMock());
      const resultado = await service.geocode("Avenida Paulista, 1000");

      expect(resultado).toEqual({
        latitude: -23.561684,
        longitude: -46.655981,
        precisao: "0.95",
        enderecoFormatado: "Avenida Paulista, Bela Vista, São Paulo - SP, 01310100, Brasil",
        logradouro: "Avenida Paulista",
        bairro: "Bela Vista",
        cidade: "São Paulo",
        estado: "SP",
      });
    });

    it("envia o User-Agent exigido pela política de uso do Nominatim público", async () => {
      mockFetchOnce(200, [
        {
          lat: "-23.5",
          lon: "-46.6",
          display_name: "Endereço",
          importance: 0.5,
          address: {},
        },
      ]);
      const service = new GeoEngineService(
        buildConfigService({ nominatimUserAgent: "MeuAgente/2.0" }),
        buildIntegrationHealthMock(),
      );

      await service.geocode("Avenida Paulista, 1000");

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ headers: { "User-Agent": "MeuAgente/2.0" } }),
      );
    });

    it("resolve a UF a partir do nome completo do estado quando o Nominatim não devolve ISO3166-2-lvl4", async () => {
      mockFetchOnce(200, [
        {
          lat: "-23.561684",
          lon: "-46.655981",
          display_name: "Avenida Paulista, São Paulo - SP",
          importance: 0.9,
          address: { city: "São Paulo", state: "São Paulo" },
        },
      ]);
      const service = new GeoEngineService(buildConfigService(), buildIntegrationHealthMock());

      const resultado = await service.geocode("Avenida Paulista, 1000");

      expect(resultado.estado).toBe("SP");
    });

    it("lança BadGatewayException quando o Nominatim não retorna nenhum resultado", async () => {
      mockFetchOnce(200, []);
      const service = new GeoEngineService(buildConfigService(), buildIntegrationHealthMock());

      await expect(service.geocode("endereço inexistente")).rejects.toThrow(BadGatewayException);
    });

    it("lança BadGatewayException quando o Nominatim responde com erro HTTP (não 429)", async () => {
      mockFetchOnce(503, {});
      const service = new GeoEngineService(buildConfigService(), buildIntegrationHealthMock());

      await expect(service.geocode("Avenida Paulista, 1000")).rejects.toThrow(BadGatewayException);
    });

    describe("rate limit (429)", () => {
      beforeEach(() => {
        jest.useFakeTimers();
      });

      afterEach(() => {
        jest.useRealTimers();
      });

      it("faz UMA retentativa após 429 e resolve normalmente se a segunda tentativa tiver sucesso", async () => {
        const fetchMock = jest
          .fn()
          .mockResolvedValueOnce({ ok: false, status: 429, json: () => Promise.resolve({}) })
          .mockResolvedValueOnce({
            ok: true,
            status: 200,
            json: () =>
              Promise.resolve([
                {
                  lat: "-23.5",
                  lon: "-46.6",
                  display_name: "Endereço",
                  importance: 0.5,
                  address: {},
                },
              ]),
          });
        global.fetch = fetchMock;
        const service = new GeoEngineService(buildConfigService(), buildIntegrationHealthMock());

        const promise = service.geocode("Avenida Paulista, 1000");
        await jest.advanceTimersByTimeAsync(2000);
        const resultado = await promise;

        expect(fetchMock).toHaveBeenCalledTimes(2);
        expect(resultado.latitude).toBe(-23.5);
      });

      it("lança NominatimRateLimitedException (não BadGatewayException genérico) quando o 429 persiste após a retentativa", async () => {
        mockFetchOnce(429, {});
        const service = new GeoEngineService(buildConfigService(), buildIntegrationHealthMock());

        const promise = service.geocode("Avenida Paulista, 1000");
        const expectation = expect(promise).rejects.toThrow(NominatimRateLimitedException);
        await jest.advanceTimersByTimeAsync(2000);
        await expectation;
      });
    });
  });

  describe("reverseGeocode", () => {
    it("extrai cidade e UF do address do Nominatim /reverse", async () => {
      mockFetchOnce(200, {
        display_name: "Avenida Paulista, 1000, São Paulo - SP",
        address: { city: "São Paulo", state: "São Paulo", "ISO3166-2-lvl4": "BR-SP" },
      });

      const service = new GeoEngineService(buildConfigService(), buildIntegrationHealthMock());
      const resultado = await service.reverseGeocode({
        latitude: -23.561684,
        longitude: -46.655981,
      });

      expect(resultado.cidade).toBe("São Paulo");
      expect(resultado.estado).toBe("SP");
    });

    it("lança BadGatewayException quando o Nominatim não devolve endereço para a coordenada", async () => {
      mockFetchOnce(200, { display_name: "" });
      const service = new GeoEngineService(buildConfigService(), buildIntegrationHealthMock());

      await expect(service.reverseGeocode({ latitude: -23.5, longitude: -46.6 })).rejects.toThrow(
        BadGatewayException,
      );
    });
  });

  describe("getRoute", () => {
    it("converte a resposta do OSRM /route para o contrato estável", async () => {
      mockFetchOnce(200, {
        code: "Ok",
        routes: [
          {
            distance: 5230.4,
            duration: 720.1,
            geometry: { type: "LineString", coordinates: [] },
            legs: [{ distance: 5230.4, duration: 720.1 }],
          },
        ],
      });

      const service = new GeoEngineService(buildConfigService(), buildIntegrationHealthMock());
      const resultado = await service.getRoute(
        { latitude: -23.561684, longitude: -46.655981 },
        { latitude: -23.55052, longitude: -46.633309 },
      );

      expect(resultado.distanciaMetros).toBe(5230.4);
      expect(resultado.duracaoSegundos).toBe(720.1);
      expect(resultado.pernas).toEqual([{ distanciaMetros: 5230.4, duracaoSegundos: 720.1 }]);
    });

    it("devolve uma perna por trecho quando há paradas intermediárias", async () => {
      mockFetchOnce(200, {
        code: "Ok",
        routes: [
          {
            distance: 9000,
            duration: 1200,
            geometry: { type: "LineString", coordinates: [] },
            legs: [
              { distance: 4000, duration: 500 },
              { distance: 5000, duration: 700 },
            ],
          },
        ],
      });

      const service = new GeoEngineService(buildConfigService(), buildIntegrationHealthMock());
      const resultado = await service.getRoute(
        { latitude: -23.561684, longitude: -46.655981 },
        { latitude: -23.55052, longitude: -46.633309 },
        [{ latitude: -23.55, longitude: -46.64 }],
      );

      expect(resultado.pernas).toEqual([
        { distanciaMetros: 4000, duracaoSegundos: 500 },
        { distanciaMetros: 5000, duracaoSegundos: 700 },
      ]);
    });

    it("lança BadGatewayException quando o OSRM não encontra rota (code NoRoute, sem routes)", async () => {
      mockFetchOnce(200, { code: "NoRoute" });
      const service = new GeoEngineService(buildConfigService(), buildIntegrationHealthMock());

      await expect(
        service.getRoute(
          { latitude: -23.5, longitude: -46.6 },
          { latitude: -23.6, longitude: -46.7 },
        ),
      ).rejects.toThrow(BadGatewayException);
    });

    it("lança BadGatewayException quando o OSRM responde com erro HTTP", async () => {
      mockFetchOnce(503, {});
      const service = new GeoEngineService(buildConfigService(), buildIntegrationHealthMock());

      await expect(
        service.getRoute(
          { latitude: -23.5, longitude: -46.6 },
          { latitude: -23.6, longitude: -46.7 },
        ),
      ).rejects.toThrow(BadGatewayException);
    });
  });

  describe("optimizeTrip", () => {
    it("traduz waypoint_index do OSRM /trip para a ordem sugerida de índices de entrada", async () => {
      // 4 pontos de entrada (0,1,2,3) — OSRM devolve a posição de cada um
      // na sequência otimizada; aqui o ponto de entrada 2 deveria vir
      // antes do 1 (0 → 1º, 2 → 2º, 1 → 3º, 3 → 4º/fixo).
      mockFetchOnce(200, {
        code: "Ok",
        trips: [{ distance: 4200, duration: 600 }],
        waypoints: [
          { waypoint_index: 0 },
          { waypoint_index: 2 },
          { waypoint_index: 1 },
          { waypoint_index: 3 },
        ],
      });

      const service = new GeoEngineService(buildConfigService(), buildIntegrationHealthMock());
      const resultado = await service.optimizeTrip([
        { latitude: -23.5, longitude: -46.6 },
        { latitude: -23.51, longitude: -46.61 },
        { latitude: -23.52, longitude: -46.62 },
        { latitude: -23.53, longitude: -46.63 },
      ]);

      expect(resultado.ordemSugerida).toEqual([0, 2, 1, 3]);
      expect(resultado.distanciaMetros).toBe(4200);
      expect(resultado.duracaoSegundos).toBe(600);
    });

    it("chama o OSRM /trip com source=first&destination=last&roundtrip=false (origem/destino fixos)", async () => {
      const fetchMock = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            code: "Ok",
            trips: [{ distance: 1000, duration: 100 }],
            waypoints: [{ waypoint_index: 0 }, { waypoint_index: 1 }],
          }),
      });
      global.fetch = fetchMock;

      const service = new GeoEngineService(buildConfigService(), buildIntegrationHealthMock());
      await service.optimizeTrip([
        { latitude: -23.5, longitude: -46.6 },
        { latitude: -23.6, longitude: -46.7 },
      ]);

      const [url] = fetchMock.mock.calls[0] as [string];
      expect(url).toContain("/trip/v1/driving/");
      expect(url).toContain("source=first");
      expect(url).toContain("destination=last");
      expect(url).toContain("roundtrip=false");
    });

    it("lança BadGatewayException quando o OSRM não encontra uma sequência (code NoTrips, sem trips)", async () => {
      mockFetchOnce(200, { code: "NoTrips" });
      const service = new GeoEngineService(buildConfigService(), buildIntegrationHealthMock());

      await expect(
        service.optimizeTrip([
          { latitude: -23.5, longitude: -46.6 },
          { latitude: -23.6, longitude: -46.7 },
        ]),
      ).rejects.toThrow(BadGatewayException);
    });

    it("lança BadGatewayException quando o OSRM responde com erro HTTP", async () => {
      mockFetchOnce(502, {});
      const service = new GeoEngineService(buildConfigService(), buildIntegrationHealthMock());

      await expect(
        service.optimizeTrip([
          { latitude: -23.5, longitude: -46.6 },
          { latitude: -23.6, longitude: -46.7 },
        ]),
      ).rejects.toThrow(BadGatewayException);
    });
  });
});
