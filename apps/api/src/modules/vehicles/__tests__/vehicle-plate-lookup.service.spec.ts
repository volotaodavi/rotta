import { ServiceUnavailableException } from "@nestjs/common";

import { VehiclePlateLookupService } from "../vehicle-plate-lookup.service";

import type { VehiclePlateLookupConfig } from "@/config/vehicle-plate-lookup.config";
import type { ConfigService } from "@nestjs/config";

function jsonResponse(body: unknown, ok = true, status = 200): Response {
  return { ok, status, json: () => Promise.resolve(body) } as unknown as Response;
}

function buildConfigService(config: VehiclePlateLookupConfig): ConfigService {
  return { get: () => config } as unknown as ConfigService;
}

describe("VehiclePlateLookupService", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.resetAllMocks();
  });

  it("isConfigured() é falso sem baseUrl/apiKey", () => {
    const service = new VehiclePlateLookupService(
      buildConfigService({ baseUrl: undefined, apiKey: undefined }),
    );
    expect(service.isConfigured()).toBe(false);
  });

  it("recusa a busca (erro claro, nunca dado inventado) quando não há provedor configurado", async () => {
    const service = new VehiclePlateLookupService(
      buildConfigService({ baseUrl: undefined, apiKey: undefined }),
    );

    await expect(service.lookup("ABC1D23")).rejects.toThrow(ServiceUnavailableException);
  });

  it("consulta o provedor configurado e normaliza a resposta", async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValue(
        jsonResponse({ marca: "Mercedes-Benz", modelo: "Sprinter 415", ano: 2022, cor: "Branco" }),
      );
    const service = new VehiclePlateLookupService(
      buildConfigService({ baseUrl: "https://provedor.example.com/placas", apiKey: "chave-123" }),
    );

    const result = await service.lookup("ABC1D23");

    expect(global.fetch).toHaveBeenCalledWith(
      "https://provedor.example.com/placas/ABC1D23",
      expect.objectContaining({ headers: { Authorization: "Bearer chave-123" } }),
    );
    expect(result).toEqual({
      marca: "Mercedes-Benz",
      modelo: "Sprinter 415",
      ano: 2022,
      cor: "Branco",
    });
  });

  it("propaga null pros campos que o provedor não devolveu (nunca inventa)", async () => {
    global.fetch = jest.fn().mockResolvedValue(jsonResponse({ marca: "Mercedes-Benz" }));
    const service = new VehiclePlateLookupService(
      buildConfigService({ baseUrl: "https://provedor.example.com/placas", apiKey: "chave-123" }),
    );

    const result = await service.lookup("ABC1D23");

    expect(result).toEqual({ marca: "Mercedes-Benz", modelo: null, ano: null, cor: null });
  });

  it("nunca deixa uma falha de rede vazar como erro cru", async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error("network down"));
    const service = new VehiclePlateLookupService(
      buildConfigService({ baseUrl: "https://provedor.example.com/placas", apiKey: "chave-123" }),
    );

    await expect(service.lookup("ABC1D23")).rejects.toThrow(ServiceUnavailableException);
  });

  it("trata HTTP não-ok do provedor como indisponibilidade", async () => {
    global.fetch = jest.fn().mockResolvedValue(jsonResponse({}, false, 500));
    const service = new VehiclePlateLookupService(
      buildConfigService({ baseUrl: "https://provedor.example.com/placas", apiKey: "chave-123" }),
    );

    await expect(service.lookup("ABC1D23")).rejects.toThrow(ServiceUnavailableException);
  });
});
