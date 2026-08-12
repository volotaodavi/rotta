import { ServiceUnavailableException } from "@nestjs/common";

import { DiditService } from "../didit.service";

import type { DiditConfig } from "@/config/didit.config";
import type { IntegrationHealthService } from "@/infra/observability/integration-health.service";
import type { ConfigService } from "@nestjs/config";

function buildConfigService(didit: DiditConfig): ConfigService {
  return { get: jest.fn().mockReturnValue(didit) } as unknown as ConfigService;
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

function jsonResponse(body: unknown, ok = true, status = 200): Response {
  return {
    ok,
    status,
    text: () => Promise.resolve(JSON.stringify(body)),
  } as unknown as Response;
}

describe("DiditService", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.resetAllMocks();
  });

  it("recusa a chamada com um erro claro quando DIDIT_API_KEY não está configurada, e registra not_configured no health tracking", async () => {
    const integrationHealth = buildIntegrationHealthMock();
    const service = new DiditService(
      buildConfigService({ apiKey: undefined, baseUrl: "https://verification.didit.me" }),
      integrationHealth,
    );

    await expect(service.verifyId("https://storage.example/cnh.jpg")).rejects.toThrow(
      ServiceUnavailableException,
    );
    expect(integrationHealth.recordNotConfigured).toHaveBeenCalledWith(
      "didit",
      expect.stringContaining("DIDIT_API_KEY"),
    );
  });

  it("verifyId baixa a imagem e envia multipart/form-data com x-api-key, retornando aprovado quando status é Approved", async () => {
    const fetchMock = jest
      .fn()
      // download da imagem
      .mockResolvedValueOnce({ ok: true, arrayBuffer: () => Promise.resolve(new ArrayBuffer(4)) })
      // chamada à Didit
      .mockResolvedValueOnce(
        jsonResponse({ status: "Approved", document_type: "Driver's License" }),
      );
    global.fetch = fetchMock;

    const integrationHealth = buildIntegrationHealthMock();
    const service = new DiditService(
      buildConfigService({ apiKey: "test-key", baseUrl: "https://verification.didit.me" }),
      integrationHealth,
    );

    const resultado = await service.verifyId("https://storage.example/cnh.jpg");

    expect(resultado).toEqual({
      status: "approved",
      aprovado: true,
      tipoDocumento: "Driver's License",
      dadosBrutos: { status: "Approved", document_type: "Driver's License" },
    });

    const [url, options] = fetchMock.mock.calls[1] as [string, RequestInit];
    expect(url).toBe("https://verification.didit.me/v3/id-verification/");
    expect((options.headers as Record<string, string>)["x-api-key"]).toBe("test-key");
    expect(integrationHealth.recordSuccess).toHaveBeenCalledWith("didit", expect.any(Number));
  });

  it("faceMatch retorna aprovado=false e o score quando o status não é Approved", async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce({ ok: true, arrayBuffer: () => Promise.resolve(new ArrayBuffer(4)) })
      .mockResolvedValueOnce({ ok: true, arrayBuffer: () => Promise.resolve(new ArrayBuffer(4)) })
      .mockResolvedValueOnce(jsonResponse({ status: "Declined", score: 0.42 }));
    global.fetch = fetchMock;

    const service = new DiditService(
      buildConfigService({ apiKey: "test-key", baseUrl: "https://verification.didit.me" }),
      buildIntegrationHealthMock(),
    );

    const resultado = await service.faceMatch(
      "https://storage.example/selfie.jpg",
      "https://storage.example/cnh.jpg",
    );

    expect(resultado.aprovado).toBe(false);
    expect(resultado.score).toBe(0.42);
  });

  it("passiveLiveness lança um erro claro quando a Didit responde HTTP não-2xx, e registra a falha no health tracking", async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce({ ok: true, arrayBuffer: () => Promise.resolve(new ArrayBuffer(4)) })
      .mockResolvedValueOnce(jsonResponse({ error: "invalid image" }, false, 400));
    global.fetch = fetchMock;

    const integrationHealth = buildIntegrationHealthMock();
    const service = new DiditService(
      buildConfigService({ apiKey: "test-key", baseUrl: "https://verification.didit.me" }),
      integrationHealth,
    );

    await expect(service.passiveLiveness("https://storage.example/selfie.jpg")).rejects.toThrow(
      "Falha na verificação Didit",
    );
    expect(integrationHealth.recordFailure).toHaveBeenCalledWith(
      "didit",
      expect.stringContaining("400"),
    );
  });

  it("lança um erro claro quando a imagem não pôde ser baixada do Supabase Storage", async () => {
    const fetchMock = jest.fn().mockResolvedValueOnce({ ok: false, status: 404 });
    global.fetch = fetchMock;

    const service = new DiditService(
      buildConfigService({ apiKey: "test-key", baseUrl: "https://verification.didit.me" }),
      buildIntegrationHealthMock(),
    );

    await expect(service.verifyId("https://storage.example/inexistente.jpg")).rejects.toThrow(
      "Não foi possível baixar o arquivo",
    );
  });
});
