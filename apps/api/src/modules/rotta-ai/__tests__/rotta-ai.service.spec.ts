import { BadRequestException, NotImplementedException } from "@nestjs/common";

import { RottaAiService } from "../rotta-ai.service";


import type { DiditService } from "@/infra/didit/didit.service";
import type { GeoEngineService } from "@/modules/geo/geo-engine.service";

import { Role } from "@/shared/enums";

function buildService(diditOverrides: Partial<DiditService> = {}) {
  const diditService = {
    verifyId: jest.fn(),
    faceMatch: jest.fn(),
    passiveLiveness: jest.fn(),
    ...diditOverrides,
  } as unknown as DiditService;

  const geoEngine = { geocode: jest.fn() } as unknown as GeoEngineService;

  return { service: new RottaAiService(geoEngine, diditService), geoEngine, diditService };
}

describe("RottaAiService", () => {
  describe("analyzeSchoolAddress", () => {
    it("delega ao Rotta Geo Engine e retorna cepValido + os campos sugeridos pelo Nominatim", async () => {
      const { service, geoEngine } = buildService();
      (geoEngine.geocode as jest.Mock).mockResolvedValue({
        latitude: -23.561684,
        longitude: -46.655981,
        precisao: "0.95",
        enderecoFormatado: "Avenida Paulista, 1000, São Paulo - SP, 01310100",
        logradouro: "Avenida Paulista",
        bairro: "Bela Vista",
        cidade: "São Paulo",
        estado: "SP",
      });

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
      const { service, geoEngine } = buildService();
      (geoEngine.geocode as jest.Mock).mockResolvedValue({
        latitude: -23.5,
        longitude: -46.6,
        precisao: "0.5",
        enderecoFormatado: "Algum lugar",
        logradouro: null,
        bairro: null,
        cidade: null,
        estado: null,
      });

      const resultado = await service.analyzeSchoolAddress({ cep: "abc123" });

      expect(resultado.cepValido).toBe(false);
    });
  });

  describe("validateDocument (Didit)", () => {
    it("CNH: delega a diditService.verifyId e mapeia o resultado", async () => {
      const { service, diditService } = buildService({
        verifyId: jest.fn().mockResolvedValue({
          status: "approved",
          aprovado: true,
          tipoDocumento: "Driver's License",
          dadosBrutos: {},
        }),
      });

      const resultado = await service.validateDocument({
        tipo: "CNH",
        referenciaArquivo: "https://storage.example/cnh.jpg",
      });

      expect(diditService.verifyId).toHaveBeenCalledWith("https://storage.example/cnh.jpg");
      expect(resultado).toEqual({
        aprovado: true,
        status: "approved",
        provedor: "didit",
        tipoDocumento: "Driver's License",
        dadosBrutos: {},
      });
    });

    it("OCR: usa o mesmo caminho de CNH (verifyId)", async () => {
      const { service, diditService } = buildService({
        verifyId: jest
          .fn()
          .mockResolvedValue({ status: "approved", aprovado: true, dadosBrutos: {} }),
      });

      await service.validateDocument({
        tipo: "OCR",
        referenciaArquivo: "https://storage.example/doc.jpg",
      });

      expect(diditService.verifyId).toHaveBeenCalled();
    });

    it("SELFIE: delega a diditService.passiveLiveness", async () => {
      const { service, diditService } = buildService({
        passiveLiveness: jest
          .fn()
          .mockResolvedValue({ status: "approved", aprovado: true, dadosBrutos: {} }),
      });

      const resultado = await service.validateDocument({
        tipo: "SELFIE",
        referenciaArquivo: "https://storage.example/selfie.jpg",
      });

      expect(diditService.passiveLiveness).toHaveBeenCalledWith(
        "https://storage.example/selfie.jpg",
      );
      expect(resultado.aprovado).toBe(true);
    });

    it("FACE_MATCH: delega a diditService.faceMatch com selfie + referência", async () => {
      const { service, diditService } = buildService({
        faceMatch: jest
          .fn()
          .mockResolvedValue({ status: "approved", aprovado: true, score: 0.91, dadosBrutos: {} }),
      });

      const resultado = await service.validateDocument({
        tipo: "FACE_MATCH",
        referenciaArquivo: "https://storage.example/selfie.jpg",
        referenciaArquivoComparacao: "https://storage.example/cnh.jpg",
      });

      expect(diditService.faceMatch).toHaveBeenCalledWith(
        "https://storage.example/selfie.jpg",
        "https://storage.example/cnh.jpg",
      );
      expect(resultado.scoreFaceMatch).toBe(0.91);
    });

    it("FACE_MATCH sem referenciaArquivoComparacao lança BadRequestException (nunca chama a Didit)", async () => {
      const { service, diditService } = buildService();

      await expect(
        service.validateDocument({
          tipo: "FACE_MATCH",
          referenciaArquivo: "https://storage.example/selfie.jpg",
        }),
      ).rejects.toThrow(BadRequestException);
      expect(diditService.faceMatch).not.toHaveBeenCalled();
    });

    it.each(["EAR", "CURSO"] as const)(
      "%s continua um stub honesto (NotImplementedException) — fora do catálogo de documentos da Didit",
      async (tipo) => {
        const { service } = buildService();

        await expect(
          service.validateDocument({ tipo, referenciaArquivo: "https://storage.example/doc.jpg" }),
        ).rejects.toThrow(NotImplementedException);
      },
    );

    it.each(["RG", "CIN", "PASSAPORTE"] as const)(
      "%s: para um papel que NÃO é Motorista, delega normalmente a diditService.verifyId",
      async (tipo) => {
        const { service, diditService } = buildService({
          verifyId: jest
            .fn()
            .mockResolvedValue({ status: "approved", aprovado: true, dadosBrutos: {} }),
        });

        const resultado = await service.validateDocument(
          { tipo, referenciaArquivo: "https://storage.example/doc.jpg" },
          Role.MONITOR,
        );

        expect(diditService.verifyId).toHaveBeenCalledWith("https://storage.example/doc.jpg");
        expect(resultado.aprovado).toBe(true);
      },
    );
  });

  describe("regra de negócio: Motorista só pode enviar CNH como documento de identidade", () => {
    it.each(["RG", "CIN", "PASSAPORTE"] as const)(
      "%s para o papel Motorista lança BadRequestException (nunca chama a Didit)",
      async (tipo) => {
        const { service, diditService } = buildService();

        await expect(
          service.validateDocument(
            { tipo, referenciaArquivo: "https://storage.example/doc.jpg" },
            Role.MOTORISTA,
          ),
        ).rejects.toThrow(BadRequestException);
        expect(diditService.verifyId).not.toHaveBeenCalled();
      },
    );

    it("CNH para o papel Motorista continua funcionando normalmente", async () => {
      const { service } = buildService({
        verifyId: jest
          .fn()
          .mockResolvedValue({ status: "approved", aprovado: true, dadosBrutos: {} }),
      });

      const resultado = await service.validateDocument(
        { tipo: "CNH", referenciaArquivo: "https://storage.example/cnh.jpg" },
        Role.MOTORISTA,
      );

      expect(resultado.aprovado).toBe(true);
    });

    it("sem papel do titular informado (endpoint genérico), a restrição não se aplica", async () => {
      const { service, diditService } = buildService({
        verifyId: jest
          .fn()
          .mockResolvedValue({ status: "approved", aprovado: true, dadosBrutos: {} }),
      });

      const resultado = await service.validateDocument({
        tipo: "RG",
        referenciaArquivo: "https://storage.example/rg.jpg",
      });

      expect(diditService.verifyId).toHaveBeenCalled();
      expect(resultado.aprovado).toBe(true);
    });
  });

  describe("demais métodos (stub honesto, sem provedor contratado)", () => {
    it("analyzeVehicleDocument continua um stub honesto (NotImplementedException)", async () => {
      const { service } = buildService();
      await expect(service.analyzeVehicleDocument({} as never)).rejects.toThrow(
        NotImplementedException,
      );
    });

    it("validarContratoAssinado continua um stub honesto (NotImplementedException)", async () => {
      const { service } = buildService();
      await expect(service.validarContratoAssinado({} as never)).rejects.toThrow(
        NotImplementedException,
      );
    });
  });
});
