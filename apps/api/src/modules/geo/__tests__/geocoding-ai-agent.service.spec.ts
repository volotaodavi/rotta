import { GeocodingAiAgentService } from "../agents/geocoding-ai-agent.service";

import type { GeoEngineService } from "../geo-engine.service";
import type { SchoolCoordinateRepository } from "../repositories/school-coordinate.repository";
import type { SchoolCoordinate } from "@prisma/client";

function buildCoordinate(overrides: Partial<SchoolCoordinate> = {}): SchoolCoordinate {
  return {
    id: "coordinate-1",
    schoolId: "school-1",
    latitude: -23.561684 as never,
    longitude: -46.655981 as never,
    precisao: "0.95",
    fonte: "MAPBOX",
    status: "PENDENTE",
    tentativa: 1,
    validadoPorIa: false,
    motivoRevisao: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe("GeocodingAiAgentService", () => {
  it("geocodifica o endereço via Rotta Geo Engine e grava UMA tentativa, sem validar o resultado", async () => {
    const coordinate = buildCoordinate();
    const geoEngine = {
      geocode: jest.fn().mockResolvedValue({
        latitude: -23.561684,
        longitude: -46.655981,
        precisao: "0.95",
        enderecoFormatado: "Avenida Paulista, 1000",
        logradouro: "Avenida Paulista",
        bairro: "Bela Vista",
        cidade: "São Paulo",
        estado: "SP",
      }),
    } as unknown as GeoEngineService;
    const coordinateRepository = {
      create: jest.fn().mockResolvedValue(coordinate),
    } as unknown as SchoolCoordinateRepository;

    const service = new GeocodingAiAgentService(geoEngine, coordinateRepository);
    const resultado = await service.geocodeSchool("school-1", "Avenida Paulista, 1000", 1);

    expect(geoEngine.geocode).toHaveBeenCalledWith("Avenida Paulista, 1000");
    expect(coordinateRepository.create).toHaveBeenCalledWith({
      schoolId: "school-1",
      latitude: -23.561684,
      longitude: -46.655981,
      precisao: "0.95",
      fonte: "MAPBOX",
      tentativa: 1,
    });
    expect(resultado).toBe(coordinate);
  });
});
