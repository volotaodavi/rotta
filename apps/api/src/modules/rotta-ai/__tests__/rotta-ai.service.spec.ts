import {
  BadGatewayException,
  BadRequestException,
  NotFoundException,
  NotImplementedException,
} from "@nestjs/common";

import { RottaAiService } from "../rotta-ai.service";

import type { AuthenticatedUser } from "@/common/decorators/current-user.decorator";
import type { PrismaService } from "@/infra/database/prisma.service";
import type { DiditService } from "@/infra/didit/didit.service";
import type { GeoEngineService } from "@/modules/geo/geo-engine.service";

import { Role } from "@/shared/enums";

const gestorActor: AuthenticatedUser = {
  sub: "user-1",
  tenantId: "company-1",
  role: Role.GESTOR,
  vinculoId: "vinculo-1",
};

function buildService(
  diditOverrides: Partial<DiditService> = {},
  geoOverrides: Partial<GeoEngineService> = {},
  prismaOverrides: { route?: unknown; routeStop?: unknown } = {},
) {
  const diditService = {
    verifyId: jest.fn(),
    faceMatch: jest.fn(),
    passiveLiveness: jest.fn(),
    ...diditOverrides,
  } as unknown as DiditService;

  const geoEngine = {
    geocode: jest.fn(),
    getRoute: jest.fn(),
    optimizeTrip: jest.fn(),
    ...geoOverrides,
  } as unknown as GeoEngineService;

  const prisma = {
    withTenant: jest.fn((operation: unknown) => operation),
    route: { findFirst: jest.fn() },
    routeStop: { findMany: jest.fn() },
    ...prismaOverrides,
  } as unknown as PrismaService;

  return {
    service: new RottaAiService(geoEngine, diditService, prisma),
    geoEngine,
    diditService,
    prisma,
  };
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
    it("validarContratoAssinado continua um stub honesto (NotImplementedException)", async () => {
      const { service } = buildService();
      await expect(service.validarContratoAssinado({} as never)).rejects.toThrow(
        NotImplementedException,
      );
    });
  });

  describe("analyzeVehicleDocument (Frente E — formato/resolução real, sem OCR)", () => {
    const originalFetch = global.fetch;
    afterEach(() => {
      global.fetch = originalFetch;
    });

    function buildMinimalPng(largura: number, altura: number): Buffer {
      const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
      const length = Buffer.alloc(4);
      length.writeUInt32BE(13, 0);
      const width = Buffer.alloc(4);
      width.writeUInt32BE(largura, 0);
      const height = Buffer.alloc(4);
      height.writeUInt32BE(altura, 0);
      return Buffer.concat([signature, length, Buffer.from("IHDR"), width, height]);
    }

    function mockFetchOk(buffer: Buffer): void {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        arrayBuffer: () =>
          Promise.resolve(
            buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength),
          ),
      });
    }

    it("qualidadeAdequada=true para uma imagem PNG acima da resolução mínima", async () => {
      const { service } = buildService();
      mockFetchOk(buildMinimalPng(1200, 900));

      const resultado = await service.analyzeVehicleDocument({
        tipo: "CRLV",
        referenciaArquivo: "https://storage.example/crlv.png",
      });

      expect(resultado.formatoValido).toBe(true);
      expect(resultado.formatoDetectado).toBe("png");
      expect(resultado.larguraPx).toBe(1200);
      expect(resultado.alturaPx).toBe(900);
      expect(resultado.qualidadeAdequada).toBe(true);
      expect(resultado.analiseCompleta).toBe(false);
      // sempre inclui a ressalva de escopo, mesmo quando a qualidade está OK.
      expect(resultado.avisos.some((aviso) => aviso.includes("não faz OCR"))).toBe(true);
    });

    it("qualidadeAdequada=false para uma imagem abaixo da resolução mínima legível", async () => {
      const { service } = buildService();
      mockFetchOk(buildMinimalPng(200, 150));

      const resultado = await service.analyzeVehicleDocument({
        tipo: "CRLV",
        referenciaArquivo: "https://storage.example/crlv-pequeno.png",
      });

      expect(resultado.qualidadeAdequada).toBe(false);
      expect(resultado.avisos.some((aviso) => aviso.includes("Resolução baixa"))).toBe(true);
    });

    it("formatoValido=false para um arquivo que não é JPEG nem PNG (ex. PDF)", async () => {
      const { service } = buildService();
      mockFetchOk(Buffer.from("%PDF-1.4\n", "utf-8"));

      const resultado = await service.analyzeVehicleDocument({
        tipo: "CRLV",
        referenciaArquivo: "https://storage.example/crlv.pdf",
      });

      expect(resultado.formatoValido).toBe(false);
      expect(resultado.qualidadeAdequada).toBe(false);
      expect(resultado.formatoDetectado).toBeNull();
    });

    it("lança BadGatewayException quando o download do arquivo falha", async () => {
      const { service } = buildService();
      global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 404 });

      await expect(
        service.analyzeVehicleDocument({
          tipo: "CRLV",
          referenciaArquivo: "https://storage.example/inexistente.png",
        }),
      ).rejects.toThrow(BadGatewayException);
    });
  });

  describe("suggestRouteOptimization (ROT-08, Frente D — Rotta Route AI real via OSRM)", () => {
    function buildStops() {
      return [
        { id: "stop-1", ordem: 1, latitude: -23.55, longitude: -46.63 },
        { id: "stop-2", ordem: 2, latitude: -23.56, longitude: -46.64 },
        { id: "stop-3", ordem: 3, latitude: -23.57, longitude: -46.65 },
        { id: "stop-4", ordem: 4, latitude: -23.58, longitude: -46.66 },
      ];
    }

    it("compara a ordem atual com a sugestão do OSRM e calcula a economia de tempo", async () => {
      const stops = buildStops();
      const { service, geoEngine, prisma } = buildService(
        {},
        {
          getRoute: jest.fn().mockResolvedValue({ duracaoSegundos: 900, distanciaMetros: 8000 }),
          optimizeTrip: jest.fn().mockResolvedValue({
            ordemSugerida: [0, 2, 1, 3],
            duracaoSegundos: 700,
            distanciaMetros: 7000,
          }),
        },
        {
          route: {
            findFirst: jest
              .fn()
              .mockResolvedValue({ id: "route-1", companyId: gestorActor.tenantId }),
          },
          routeStop: { findMany: jest.fn().mockResolvedValue(stops) },
        },
      );

      const resultado = await service.suggestRouteOptimization({ routeId: "route-1" }, gestorActor);

      expect(resultado.ordemAtualIds).toEqual(["stop-1", "stop-2", "stop-3", "stop-4"]);
      expect(resultado.ordemSugeridaIds).toEqual(["stop-1", "stop-3", "stop-2", "stop-4"]);
      expect(resultado.duracaoAtualSegundos).toBe(900);
      expect(resultado.duracaoSugeridaSegundos).toBe(700);
      expect(resultado.economiaSegundos).toBe(200);
      expect(resultado.distanciaSugeridaMetros).toBe(7000);
      expect(resultado.jaOtimizada).toBe(false);

      // origem/destino fixos: `getRoute` recebe stop-1 e stop-4 como origem/destino, stop-2/stop-3 como intermediárias.
      expect(geoEngine.getRoute).toHaveBeenCalledWith(
        { latitude: -23.55, longitude: -46.63 },
        { latitude: -23.58, longitude: -46.66 },
        [
          { latitude: -23.56, longitude: -46.64 },
          { latitude: -23.57, longitude: -46.65 },
        ],
      );
      expect(prisma.withTenant).toHaveBeenCalled();
    });

    it("marca jaOtimizada=true quando a ordem sugerida é idêntica à atual", async () => {
      const stops = buildStops();
      const { service } = buildService(
        {},
        {
          getRoute: jest.fn().mockResolvedValue({ duracaoSegundos: 700, distanciaMetros: 7000 }),
          optimizeTrip: jest.fn().mockResolvedValue({
            ordemSugerida: [0, 1, 2, 3],
            duracaoSegundos: 700,
            distanciaMetros: 7000,
          }),
        },
        {
          route: {
            findFirst: jest
              .fn()
              .mockResolvedValue({ id: "route-1", companyId: gestorActor.tenantId }),
          },
          routeStop: { findMany: jest.fn().mockResolvedValue(stops) },
        },
      );

      const resultado = await service.suggestRouteOptimization({ routeId: "route-1" }, gestorActor);

      expect(resultado.jaOtimizada).toBe(true);
      expect(resultado.economiaSegundos).toBe(0);
    });

    it("nunca devolve economia negativa mesmo se, por alguma razão, a sugestão for pior que a atual", async () => {
      const stops = buildStops();
      const { service } = buildService(
        {},
        {
          getRoute: jest.fn().mockResolvedValue({ duracaoSegundos: 500, distanciaMetros: 5000 }),
          optimizeTrip: jest.fn().mockResolvedValue({
            ordemSugerida: [0, 2, 1, 3],
            duracaoSegundos: 600,
            distanciaMetros: 6000,
          }),
        },
        {
          route: {
            findFirst: jest
              .fn()
              .mockResolvedValue({ id: "route-1", companyId: gestorActor.tenantId }),
          },
          routeStop: { findMany: jest.fn().mockResolvedValue(stops) },
        },
      );

      const resultado = await service.suggestRouteOptimization({ routeId: "route-1" }, gestorActor);

      expect(resultado.economiaSegundos).toBe(0);
    });

    it("rejeita rotas com menos de 3 paradas — abaixo disso não há ganho relevante a calcular", async () => {
      const { service } = buildService(
        {},
        {},
        {
          route: {
            findFirst: jest
              .fn()
              .mockResolvedValue({ id: "route-1", companyId: gestorActor.tenantId }),
          },
          routeStop: {
            findMany: jest.fn().mockResolvedValue(buildStops().slice(0, 2)),
          },
        },
      );

      await expect(
        service.suggestRouteOptimization({ routeId: "route-1" }, gestorActor),
      ).rejects.toThrow(BadRequestException);
    });

    it("lança NotFoundException quando a rota não existe ou não pertence ao tenant do ator (RLS filtra, nunca vaza qual dos dois casos)", async () => {
      const { service } = buildService(
        {},
        {},
        { route: { findFirst: jest.fn().mockResolvedValue(null) } },
      );

      await expect(
        service.suggestRouteOptimization({ routeId: "route-inexistente" }, gestorActor),
      ).rejects.toThrow(NotFoundException);
    });

    it("lança NotFoundException (defesa em profundidade) quando a rota devolvida pertence a outro tenant", async () => {
      const { service } = buildService(
        {},
        {},
        {
          route: {
            findFirst: jest.fn().mockResolvedValue({ id: "route-1", companyId: "outra-empresa" }),
          },
        },
      );

      await expect(
        service.suggestRouteOptimization({ routeId: "route-1" }, gestorActor),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
