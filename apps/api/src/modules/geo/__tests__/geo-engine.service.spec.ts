import { BadGatewayException } from "@nestjs/common";

import { GeoEngineService } from "../geo-engine.service";

import type { GeoConfig } from "@/config/geo.config";
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

      const service = new GeoEngineService(buildConfigService());
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
      const service = new GeoEngineService(buildConfigService());

      const resultado = await service.geocode("Avenida Paulista, 1000");

      expect(resultado.estado).toBe("SP");
    });

    it("lança BadGatewayException quando o Nominatim não retorna nenhum resultado", async () => {
      mockFetchOnce(200, []);
      const service = new GeoEngineService(buildConfigService());

      await expect(service.geocode("endereço inexistente")).rejects.toThrow(BadGatewayException);
    });

    it("lança BadGatewayException quando o Nominatim responde com erro HTTP", async () => {
      mockFetchOnce(429, {});
      const service = new GeoEngineService(buildConfigService());

      await expect(service.geocode("Avenida Paulista, 1000")).rejects.toThrow(BadGatewayException);
    });
  });

  describe("reverseGeocode", () => {
    it("extrai cidade e UF do address do Nominatim /reverse", async () => {
      mockFetchOnce(200, {
        display_name: "Avenida Paulista, 1000, São Paulo - SP",
        address: { city: "São Paulo", state: "São Paulo", "ISO3166-2-lvl4": "BR-SP" },
      });

      const service = new GeoEngineService(buildConfigService());
      const resultado = await service.reverseGeocode({
        latitude: -23.561684,
        longitude: -46.655981,
      });

      expect(resultado.cidade).toBe("São Paulo");
      expect(resultado.estado).toBe("SP");
    });

    it("lança BadGatewayException quando o Nominatim não devolve endereço para a coordenada", async () => {
      mockFetchOnce(200, { display_name: "" });
      const service = new GeoEngineService(buildConfigService());

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
          { distance: 5230.4, duration: 720.1, geometry: { type: "LineString", coordinates: [] } },
        ],
      });

      const service = new GeoEngineService(buildConfigService());
      const resultado = await service.getRoute(
        { latitude: -23.561684, longitude: -46.655981 },
        { latitude: -23.55052, longitude: -46.633309 },
      );

      expect(resultado.distanciaMetros).toBe(5230.4);
      expect(resultado.duracaoSegundos).toBe(720.1);
    });

    it("lança BadGatewayException quando o OSRM não encontra rota (code NoRoute, sem routes)", async () => {
      mockFetchOnce(200, { code: "NoRoute" });
      const service = new GeoEngineService(buildConfigService());

      await expect(
        service.getRoute(
          { latitude: -23.5, longitude: -46.6 },
          { latitude: -23.6, longitude: -46.7 },
        ),
      ).rejects.toThrow(BadGatewayException);
    });

    it("lança BadGatewayException quando o OSRM responde com erro HTTP", async () => {
      mockFetchOnce(503, {});
      const service = new GeoEngineService(buildConfigService());

      await expect(
        service.getRoute(
          { latitude: -23.5, longitude: -46.6 },
          { latitude: -23.6, longitude: -46.7 },
        ),
      ).rejects.toThrow(BadGatewayException);
    });
  });
});
