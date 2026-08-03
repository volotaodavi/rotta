import { ValidationAiAgentService } from "../agents/validation-ai-agent.service";

import type { GeocodingAiAgentService } from "../agents/geocoding-ai-agent.service";
import type { GeoEngineService } from "../geo-engine.service";
import type { SchoolCoordinateRepository } from "../repositories/school-coordinate.repository";
import type { SchoolRepository } from "@/modules/schools/repositories/school.repository";
import type { School, SchoolCoordinate } from "@prisma/client";

function buildSchool(overrides: Partial<School> = {}): School {
  return {
    id: "school-1",
    codigoInterno: "ESC-000001",
    codigoInep: null,
    nomeOficial: "EMEF Professora Ana Souza",
    nomeFantasia: null,
    redeEnsino: null,
    dependenciaAdministrativa: "MUNICIPAL",
    cnpj: null,
    telefone: null,
    whatsapp: null,
    email: null,
    website: null,
    cep: "01310100",
    logradouro: "Avenida Paulista",
    numero: "1000",
    complemento: null,
    bairro: "Bela Vista",
    cidade: "São Paulo",
    estado: "SP",
    pais: "Brasil",
    latitude: null,
    longitude: null,
    observacoesLocalizacao: null,
    tipos: ["FUNDAMENTAL"],
    turnosAtendidos: ["MANHA"],
    status: "ATIVA",
    origemCadastro: "MANUAL",
    criadoPorId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    ...overrides,
  };
}

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

describe("ValidationAiAgentService", () => {
  it("aprova (VALIDADO) quando cidade/estado do reverse geocode conferem e a precisão é suficiente, e copia a coordenada para School", async () => {
    const coordinate = buildCoordinate();
    const school = buildSchool();
    const geoEngine = {
      reverseGeocode: jest.fn().mockResolvedValue({
        cidade: "São Paulo",
        estado: "SP",
        enderecoFormatado: "Avenida Paulista, 1000, São Paulo - SP",
      }),
    } as unknown as GeoEngineService;
    const coordinateRepository = {
      updateStatus: jest
        .fn()
        .mockResolvedValue({ ...coordinate, status: "VALIDADO", validadoPorIa: true }),
    } as unknown as SchoolCoordinateRepository;
    const schoolRepository = {
      update: jest.fn().mockResolvedValue(school),
    } as unknown as SchoolRepository;
    const geocodingAgent = {} as unknown as GeocodingAiAgentService;

    const service = new ValidationAiAgentService(
      geoEngine,
      geocodingAgent,
      coordinateRepository,
      schoolRepository,
    );
    const outcome = await service.validate(coordinate, school);

    expect(outcome.status).toBe("VALIDADO");
    expect(coordinateRepository.updateStatus).toHaveBeenCalledWith("coordinate-1", "VALIDADO", {
      validadoPorIa: true,
    });
    expect(schoolRepository.update).toHaveBeenCalledWith("school-1", {
      latitude: -23.561684,
      longitude: -46.655981,
    });
  });

  it("reprova (REPROCESSANDO) quando a cidade do reverse geocode não confere, e aciona o Geocoding AI Agent para uma nova tentativa", async () => {
    const coordinate = buildCoordinate({ tentativa: 1 });
    const school = buildSchool();
    const geoEngine = {
      reverseGeocode: jest.fn().mockResolvedValue({
        cidade: "Rio de Janeiro",
        estado: "RJ",
        enderecoFormatado: "Algum lugar no Rio",
      }),
    } as unknown as GeoEngineService;
    const proxima = buildCoordinate({ id: "coordinate-2", tentativa: 2 });
    const coordinateRepository = {
      updateStatus: jest
        .fn()
        .mockResolvedValue({ ...coordinate, status: "REPROCESSAR", validadoPorIa: false }),
    } as unknown as SchoolCoordinateRepository;
    const schoolRepository = {} as unknown as SchoolRepository;
    const geocodingAgent = {
      geocodeSchool: jest.fn().mockResolvedValue(proxima),
    } as unknown as GeocodingAiAgentService;

    const service = new ValidationAiAgentService(
      geoEngine,
      geocodingAgent,
      coordinateRepository,
      schoolRepository,
    );
    const outcome = await service.validate(coordinate, school);

    expect(outcome.status).toBe("REPROCESSANDO");
    if (outcome.status === "REPROCESSANDO") {
      expect(outcome.proxima).toBe(proxima);
    }
    expect(geocodingAgent.geocodeSchool).toHaveBeenCalledWith(
      "school-1",
      expect.stringContaining("Avenida Paulista"),
      2,
    );
  });

  it("na 3ª tentativa reprovada, cai na Fila de Revisão Manual (REVISAO_MANUAL) em vez de tentar de novo", async () => {
    const coordinate = buildCoordinate({ tentativa: 3 });
    const school = buildSchool();
    const geoEngine = {
      reverseGeocode: jest.fn().mockResolvedValue({
        cidade: "Rio de Janeiro",
        estado: "RJ",
        enderecoFormatado: "Algum lugar no Rio",
      }),
    } as unknown as GeoEngineService;
    const coordinateRepository = {
      updateStatus: jest
        .fn()
        .mockResolvedValue({ ...coordinate, status: "REVISAO_MANUAL", validadoPorIa: false }),
    } as unknown as SchoolCoordinateRepository;
    const schoolRepository = {} as unknown as SchoolRepository;
    const geocodingAgent = { geocodeSchool: jest.fn() } as unknown as GeocodingAiAgentService;

    const service = new ValidationAiAgentService(
      geoEngine,
      geocodingAgent,
      coordinateRepository,
      schoolRepository,
    );
    const outcome = await service.validate(coordinate, school);

    expect(outcome.status).toBe("REVISAO_MANUAL");
    expect(geocodingAgent.geocodeSchool).not.toHaveBeenCalled();
    expect(coordinateRepository.updateStatus).toHaveBeenCalledWith(
      "coordinate-1",
      "REVISAO_MANUAL",
      expect.objectContaining({ validadoPorIa: false }),
    );
  });

  it("reprova quando a precisão está abaixo do mínimo, mesmo com cidade/estado corretos", async () => {
    const coordinate = buildCoordinate({ precisao: "0.2", tentativa: 1 });
    const school = buildSchool();
    const geoEngine = {
      reverseGeocode: jest.fn().mockResolvedValue({
        cidade: "São Paulo",
        estado: "SP",
        enderecoFormatado: "Avenida Paulista, 1000, São Paulo - SP",
      }),
    } as unknown as GeoEngineService;
    const coordinateRepository = {
      updateStatus: jest.fn().mockResolvedValue({ ...coordinate, status: "REPROCESSAR" }),
    } as unknown as SchoolCoordinateRepository;
    const schoolRepository = {} as unknown as SchoolRepository;
    const geocodingAgent = {
      geocodeSchool: jest
        .fn()
        .mockResolvedValue(buildCoordinate({ id: "coordinate-2", tentativa: 2 })),
    } as unknown as GeocodingAiAgentService;

    const service = new ValidationAiAgentService(
      geoEngine,
      geocodingAgent,
      coordinateRepository,
      schoolRepository,
    );
    const outcome = await service.validate(coordinate, school);

    expect(outcome.status).toBe("REPROCESSANDO");
  });
});
