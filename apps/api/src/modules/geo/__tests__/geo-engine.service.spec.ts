import { BadGatewayException, ServiceUnavailableException } from "@nestjs/common";

import { GeoEngineService } from "../geo-engine.service";

import type { ConfigService } from "@nestjs/config";

function buildConfigService(mapboxAccessToken: string | undefined): ConfigService {
  return {
    get: () => ({ mapboxAccessToken }),
  } as unknown as ConfigService;
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

  describe("sem MAPBOX_ACCESS_TOKEN configurado", () => {
    it("recusa geocode/reverseGeocode/getRoute com ServiceUnavailableException, nunca simula um resultado", async () => {
      const service = new GeoEngineService(buildConfigService(undefined));

      await expect(service.geocode("Avenida Paulista, 1000")).rejects.toThrow(
        ServiceUnavailableException,
      );
      await expect(service.reverseGeocode({ latitude: -23.5, longitude: -46.6 })).rejects.toThrow(
        ServiceUnavailableException,
      );
      await expect(
        service.getRoute(
          { latitude: -23.5, longitude: -46.6 },
          { latitude: -23.6, longitude: -46.7 },
        ),
      ).rejects.toThrow(ServiceUnavailableException);
    });
  });

  describe("geocode", () => {
    it("converte a resposta do Mapbox Geocoding API para o contrato estável do Rotta Geo Engine", async () => {
      mockFetchOnce(200, {
        features: [
          {
            center: [-46.655981, -23.561684],
            place_name: "Avenida Paulista, 1000, São Paulo - SP, 01310100, Brasil",
            relevance: 0.95,
            text: "Avenida Paulista",
            context: [
              { id: "neighborhood.123", text: "Bela Vista" },
              { id: "place.456", text: "São Paulo" },
              { id: "region.789", text: "São Paulo", short_code: "BR-SP" },
            ],
          },
        ],
      });

      const service = new GeoEngineService(buildConfigService("pk.test"));
      const resultado = await service.geocode("Avenida Paulista, 1000");

      expect(resultado).toEqual({
        latitude: -23.561684,
        longitude: -46.655981,
        precisao: "0.95",
        enderecoFormatado: "Avenida Paulista, 1000, São Paulo - SP, 01310100, Brasil",
        logradouro: "Avenida Paulista",
        bairro: "Bela Vista",
        cidade: "São Paulo",
        estado: "SP",
      });
    });

    it("lança BadGatewayException quando o Mapbox não retorna nenhuma feature", async () => {
      mockFetchOnce(200, { features: [] });
      const service = new GeoEngineService(buildConfigService("pk.test"));

      await expect(service.geocode("endereço inexistente")).rejects.toThrow(BadGatewayException);
    });

    it("lança BadGatewayException quando o Mapbox responde com erro HTTP", async () => {
      mockFetchOnce(403, {});
      const service = new GeoEngineService(buildConfigService("pk.test"));

      await expect(service.geocode("Avenida Paulista, 1000")).rejects.toThrow(BadGatewayException);
    });
  });

  describe("reverseGeocode", () => {
    it("extrai cidade e UF do context do Mapbox (short_code prefixado pelo país)", async () => {
      mockFetchOnce(200, {
        features: [
          {
            center: [-46.655981, -23.561684],
            place_name: "Avenida Paulista, 1000, São Paulo - SP",
            relevance: 0.9,
            context: [
              { id: "place.456", text: "São Paulo" },
              { id: "region.789", text: "São Paulo", short_code: "BR-SP" },
            ],
          },
        ],
      });

      const service = new GeoEngineService(buildConfigService("pk.test"));
      const resultado = await service.reverseGeocode({
        latitude: -23.561684,
        longitude: -46.655981,
      });

      expect(resultado.cidade).toBe("São Paulo");
      expect(resultado.estado).toBe("SP");
    });
  });

  describe("getRoute", () => {
    it("converte a resposta do Mapbox Directions API para o contrato estável", async () => {
      mockFetchOnce(200, {
        code: "Ok",
        routes: [
          { distance: 5230.4, duration: 720.1, geometry: { type: "LineString", coordinates: [] } },
        ],
      });

      const service = new GeoEngineService(buildConfigService("pk.test"));
      const resultado = await service.getRoute(
        { latitude: -23.561684, longitude: -46.655981 },
        { latitude: -23.55052, longitude: -46.633309 },
      );

      expect(resultado.distanciaMetros).toBe(5230.4);
      expect(resultado.duracaoSegundos).toBe(720.1);
    });

    it("lança BadGatewayException quando o Mapbox não retorna nenhuma rota", async () => {
      mockFetchOnce(200, { code: "NoRoute", routes: [] });
      const service = new GeoEngineService(buildConfigService("pk.test"));

      await expect(
        service.getRoute(
          { latitude: -23.5, longitude: -46.6 },
          { latitude: -23.6, longitude: -46.7 },
        ),
      ).rejects.toThrow(BadGatewayException);
    });
  });
});
