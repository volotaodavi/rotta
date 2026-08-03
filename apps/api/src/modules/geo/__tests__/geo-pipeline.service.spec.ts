import { NotFoundException } from "@nestjs/common";

import { GeoPipelineService } from "../geo-pipeline.service";

import type { GeocodingAiAgentService } from "../agents/geocoding-ai-agent.service";
import type { ValidationAiAgentService } from "../agents/validation-ai-agent.service";
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
    fonte: "NOMINATIM",
    status: "PENDENTE",
    tentativa: 1,
    validadoPorIa: false,
    motivoRevisao: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe("GeoPipelineService", () => {
  it("lança NotFoundException quando a escola não existe", async () => {
    const schoolRepository = {
      findById: jest.fn().mockResolvedValue(null),
    } as unknown as SchoolRepository;
    const service = new GeoPipelineService(
      {} as GeocodingAiAgentService,
      {} as ValidationAiAgentService,
      schoolRepository,
      {} as SchoolCoordinateRepository,
    );

    await expect(service.geocodeSchool("school-inexistente")).rejects.toThrow(NotFoundException);
  });

  it("geocodifica e retorna direto quando a 1ª tentativa já é aprovada", async () => {
    const school = buildSchool();
    const coordinate = buildCoordinate();
    const validado = { ...coordinate, status: "VALIDADO" as const };
    const schoolRepository = {
      findById: jest.fn().mockResolvedValue(school),
    } as unknown as SchoolRepository;
    const geocodingAgent = {
      geocodeSchool: jest.fn().mockResolvedValue(coordinate),
    } as unknown as GeocodingAiAgentService;
    const validationAgent = {
      validate: jest.fn().mockResolvedValue({ status: "VALIDADO", coordinate: validado }),
    } as unknown as ValidationAiAgentService;

    const service = new GeoPipelineService(
      geocodingAgent,
      validationAgent,
      schoolRepository,
      {} as SchoolCoordinateRepository,
    );
    const resultado = await service.geocodeSchool("school-1");

    expect(geocodingAgent.geocodeSchool).toHaveBeenCalledTimes(1);
    expect(validationAgent.validate).toHaveBeenCalledTimes(1);
    expect(resultado).toBe(validado);
  });

  it("nunca chama o Validation AI Agent mais que MAX_TENTATIVAS vezes, mesmo se ele sempre reprovar (nunca loop infinito)", async () => {
    const school = buildSchool();
    const coordinate = buildCoordinate();
    const schoolRepository = {
      findById: jest.fn().mockResolvedValue(school),
    } as unknown as SchoolRepository;
    const geocodingAgent = {
      geocodeSchool: jest.fn().mockResolvedValue(coordinate),
    } as unknown as GeocodingAiAgentService;
    const validationAgent = {
      validate: jest.fn().mockResolvedValue({
        status: "REPROCESSANDO",
        anterior: coordinate,
        proxima: coordinate,
      }),
    } as unknown as ValidationAiAgentService;

    const service = new GeoPipelineService(
      geocodingAgent,
      validationAgent,
      schoolRepository,
      {} as SchoolCoordinateRepository,
    );
    await service.geocodeSchool("school-1");

    expect(validationAgent.validate).toHaveBeenCalledTimes(3);
  });

  describe("resolveManualReview", () => {
    it("lança NotFoundException quando a coordenada não existe ou não está em REVISAO_MANUAL", async () => {
      const coordinateRepository = {
        findById: jest.fn().mockResolvedValue(buildCoordinate({ status: "PENDENTE" })),
      } as unknown as SchoolCoordinateRepository;
      const service = new GeoPipelineService(
        {} as GeocodingAiAgentService,
        {} as ValidationAiAgentService,
        {} as SchoolRepository,
        coordinateRepository,
      );

      await expect(
        service.resolveManualReview("coordinate-1", { latitude: -23.5, longitude: -46.6 }),
      ).rejects.toThrow(NotFoundException);
    });

    it("grava uma NOVA tentativa (fonte MANUAL, já VALIDADO) e atualiza School.latitude/longitude", async () => {
      const anterior = buildCoordinate({ status: "REVISAO_MANUAL", tentativa: 3 });
      const school = buildSchool();
      const nova = buildCoordinate({ id: "coordinate-2", fonte: "MANUAL", tentativa: 4 });
      const coordinateRepository = {
        findById: jest.fn().mockResolvedValue(anterior),
        create: jest.fn().mockResolvedValue(nova),
        updateStatus: jest.fn().mockResolvedValue({ ...nova, status: "VALIDADO" }),
      } as unknown as SchoolCoordinateRepository;
      const schoolRepository = {
        findById: jest.fn().mockResolvedValue(school),
        update: jest.fn().mockResolvedValue(school),
      } as unknown as SchoolRepository;

      const service = new GeoPipelineService(
        {} as GeocodingAiAgentService,
        {} as ValidationAiAgentService,
        schoolRepository,
        coordinateRepository,
      );
      const resultado = await service.resolveManualReview("coordinate-1", {
        latitude: -23.5,
        longitude: -46.6,
      });

      expect(resultado.status).toBe("VALIDADO");
      expect(coordinateRepository.create).toHaveBeenCalledWith({
        schoolId: "school-1",
        latitude: -23.5,
        longitude: -46.6,
        precisao: "1.00",
        fonte: "MANUAL",
        tentativa: 4,
      });
      expect(coordinateRepository.updateStatus).toHaveBeenCalledWith("coordinate-2", "VALIDADO", {
        validadoPorIa: false,
      });
      expect(schoolRepository.update).toHaveBeenCalledWith("school-1", {
        latitude: -23.5,
        longitude: -46.6,
      });
    });
  });
});
