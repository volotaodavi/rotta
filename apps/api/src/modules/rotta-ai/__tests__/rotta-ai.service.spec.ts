import { NotImplementedException } from "@nestjs/common";

import { RottaAiService } from "../rotta-ai.service";

import type { GeoEngineService } from "@/modules/geo/geo-engine.service";

describe("RottaAiService", () => {
  describe("analyzeSchoolAddress", () => {
    it("delega ao Rotta Geo Engine e retorna cepValido + os campos sugeridos pelo Mapbox", async () => {
      const geoEngine = {
        geocode: jest.fn().mockResolvedValue({
          latitude: -23.561684,
          longitude: -46.655981,
          precisao: "0.95",
          enderecoFormatado: "Avenida Paulista, 1000, São Paulo - SP, 01310100",
          logradouro: "Avenida Paulista",
          bairro: "Bela Vista",
          cidade: "São Paulo",
          estado: "SP",
        }),
      } as unknown as GeoEngineService;

      const service = new RottaAiService(geoEngine);
      const resultado = await service.analyzeSchoolAddress({
        cep: "01310-100",
        enderecoLivre: "Avenida Paulista, 1000",
      });

      expect(geoEngine.geocode).toHaveBeenCalledWith("Avenida Paulista, 1000, 01310-100");
      expect(resultado).toEqual({
        cepValido: true,
        logradouroSugerido: "Avenida Paulista",
        bairroSugerido: "Bela Vista",
        cidadeSugerida: "São Paulo",
        estadoSugerido: "SP",
        latitude: -23.561684,
        longitude: -46.655981,
      });
    });

    it("marca cepValido como false para um CEP fora do formato brasileiro, sem deixar de geocodificar", async () => {
      const geoEngine = {
        geocode: jest.fn().mockResolvedValue({
          latitude: -23.5,
          longitude: -46.6,
          precisao: "0.5",
          enderecoFormatado: "Algum lugar",
          logradouro: null,
          bairro: null,
          cidade: null,
          estado: null,
        }),
      } as unknown as GeoEngineService;

      const service = new RottaAiService(geoEngine);
      const resultado = await service.analyzeSchoolAddress({ cep: "abc123" });

      expect(resultado.cepValido).toBe(false);
    });
  });

  describe("demais métodos (stub honesto, sem provedor contratado)", () => {
    it("validateDocument continua um stub honesto (NotImplementedException)", async () => {
      const service = new RottaAiService({} as GeoEngineService);
      await expect(service.validateDocument({} as never)).rejects.toThrow(NotImplementedException);
    });

    it("analyzeVehicleDocument continua um stub honesto (NotImplementedException)", async () => {
      const service = new RottaAiService({} as GeoEngineService);
      await expect(service.analyzeVehicleDocument({} as never)).rejects.toThrow(
        NotImplementedException,
      );
    });

    it("validarContratoAssinado continua um stub honesto (NotImplementedException)", async () => {
      const service = new RottaAiService({} as GeoEngineService);
      await expect(service.validarContratoAssinado({} as never)).rejects.toThrow(
        NotImplementedException,
      );
    });
  });
});
