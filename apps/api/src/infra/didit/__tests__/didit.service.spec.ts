import { ServiceUnavailableException } from "@nestjs/common";

import { DiditService } from "../didit.service";

import type { DiditConfig } from "@/config/didit.config";
import type { IntegrationHealthService } from "@/infra/observability/integration-health.service";
import type { ConfigService } from "@nestjs/config";

const DEFAULT_CONFIG: DiditConfig = {
  apiKey: "test-key",
  baseUrl: "https://verification.didit.me",
  webhookSecret: undefined,
  workflowIdMotorista: "workflow-motorista",
  workflowIdMonitor: "workflow-monitor",
  apiPublicUrl: undefined,
};

function buildConfigService(didit: Partial<DiditConfig>): ConfigService {
  return {
    get: jest.fn().mockReturnValue({ ...DEFAULT_CONFIG, ...didit }),
  } as unknown as ConfigService;
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
    const service = new DiditService(buildConfigService({ apiKey: undefined }), integrationHealth);

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
    const service = new DiditService(buildConfigService({}), integrationHealth);

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

    const service = new DiditService(buildConfigService({}), buildIntegrationHealthMock());

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
    const service = new DiditService(buildConfigService({}), integrationHealth);

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

    const service = new DiditService(buildConfigService({}), buildIntegrationHealthMock());

    await expect(service.verifyId("https://storage.example/inexistente.jpg")).rejects.toThrow(
      "Não foi possível baixar o arquivo",
    );
  });

  describe("createVerificationSession", () => {
    it("envia JSON com x-api-key, workflow_id e vendor_data, retornando sessionId/url/status", async () => {
      const fetchMock = jest.fn().mockResolvedValueOnce(
        jsonResponse({
          session_id: "sess_123",
          url: "https://verify.didit.me/session/sess_123",
          status: "Not Started",
        }),
      );
      global.fetch = fetchMock;

      const integrationHealth = buildIntegrationHealthMock();
      const service = new DiditService(buildConfigService({}), integrationHealth);

      const resultado = await service.createVerificationSession("user-1", "workflow-motorista");

      expect(resultado).toEqual({
        sessionId: "sess_123",
        url: "https://verify.didit.me/session/sess_123",
        status: "not started",
      });

      const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(url).toBe("https://verification.didit.me/v3/session/");
      expect((options.headers as Record<string, string>)["x-api-key"]).toBe("test-key");
      expect((options.headers as Record<string, string>)["Content-Type"]).toBe("application/json");
      expect(JSON.parse(options.body as string)).toEqual({
        workflow_id: "workflow-motorista",
        vendor_data: "user-1",
      });
      expect(integrationHealth.recordSuccess).toHaveBeenCalledWith("didit", expect.any(Number));
    });

    it("inclui callback no body só quando callbackUrl é passado", async () => {
      const fetchMock = jest
        .fn()
        .mockResolvedValueOnce(
          jsonResponse({ session_id: "sess_1", url: "https://verify.didit.me/session/sess_1" }),
        );
      global.fetch = fetchMock;

      const service = new DiditService(buildConfigService({}), buildIntegrationHealthMock());

      await service.createVerificationSession(
        "user-1",
        "workflow-motorista",
        "https://app.rotta.com.br/voltar",
      );

      const [, options] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(JSON.parse(options.body as string)).toEqual({
        workflow_id: "workflow-motorista",
        vendor_data: "user-1",
        callback: "https://app.rotta.com.br/voltar",
      });
    });

    it("lança um erro claro quando a resposta não tem session_id/url", async () => {
      const fetchMock = jest.fn().mockResolvedValueOnce(jsonResponse({ status: "Not Started" }));
      global.fetch = fetchMock;

      const service = new DiditService(buildConfigService({}), buildIntegrationHealthMock());

      await expect(
        service.createVerificationSession("user-1", "workflow-motorista"),
      ).rejects.toThrow("sem session_id/url");
    });

    it("recusa quando DIDIT_API_KEY não está configurada", async () => {
      const service = new DiditService(
        buildConfigService({ apiKey: undefined }),
        buildIntegrationHealthMock(),
      );

      await expect(
        service.createVerificationSession("user-1", "workflow-motorista"),
      ).rejects.toThrow(ServiceUnavailableException);
    });
  });

  describe("getSessionDecision", () => {
    it("faz GET em /v3/session/{id}/decision/ com x-api-key e devolve o payload bruto", async () => {
      const fetchMock = jest
        .fn()
        .mockResolvedValueOnce(
          jsonResponse({ status: "Declined", reviews: [{ comment: "Documento ilegível." }] }),
        );
      global.fetch = fetchMock;

      const integrationHealth = buildIntegrationHealthMock();
      const service = new DiditService(buildConfigService({}), integrationHealth);

      const resultado = await service.getSessionDecision("sess_1");

      expect(resultado).toEqual({
        sessionId: "sess_1",
        status: "declined",
        raw: { status: "Declined", reviews: [{ comment: "Documento ilegível." }] },
      });

      const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(url).toBe("https://verification.didit.me/v3/session/sess_1/decision/");
      expect(options.method).toBe("GET");
      expect((options.headers as Record<string, string>)["x-api-key"]).toBe("test-key");
      expect(integrationHealth.recordSuccess).toHaveBeenCalledWith("didit", expect.any(Number));
    });

    it("recusa quando DIDIT_API_KEY não está configurada", async () => {
      const service = new DiditService(
        buildConfigService({ apiKey: undefined }),
        buildIntegrationHealthMock(),
      );

      await expect(service.getSessionDecision("sess_1")).rejects.toThrow(
        ServiceUnavailableException,
      );
    });
  });

  describe("updateSessionStatus", () => {
    it("faz PATCH em /v3/session/{id}/update-status/ com new_status e comment", async () => {
      const fetchMock = jest.fn().mockResolvedValueOnce(jsonResponse({ session_id: "sess_1" }));
      global.fetch = fetchMock;

      const service = new DiditService(buildConfigService({}), buildIntegrationHealthMock());

      await service.updateSessionStatus("sess_1", "Declined", "Documento ilegível.");

      const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(url).toBe("https://verification.didit.me/v3/session/sess_1/update-status/");
      expect(options.method).toBe("PATCH");
      expect((options.headers as Record<string, string>)["Content-Type"]).toBe("application/json");
      expect(JSON.parse(options.body as string)).toEqual({
        new_status: "Declined",
        comment: "Documento ilegível.",
      });
    });

    it("omite comment do body quando não é passado", async () => {
      const fetchMock = jest.fn().mockResolvedValueOnce(jsonResponse({ session_id: "sess_1" }));
      global.fetch = fetchMock;

      const service = new DiditService(buildConfigService({}), buildIntegrationHealthMock());

      await service.updateSessionStatus("sess_1", "Approved");

      const [, options] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(JSON.parse(options.body as string)).toEqual({ new_status: "Approved" });
    });

    it("recusa quando DIDIT_API_KEY não está configurada", async () => {
      const service = new DiditService(
        buildConfigService({ apiKey: undefined }),
        buildIntegrationHealthMock(),
      );

      await expect(service.updateSessionStatus("sess_1", "Approved")).rejects.toThrow(
        ServiceUnavailableException,
      );
    });
  });

  describe("listWebhookDestinations", () => {
    it("aceita uma resposta em array direto", async () => {
      const fetchMock = jest.fn().mockResolvedValueOnce(
        jsonResponse([
          { id: "dest_1", url: "https://api.rotta.com.br/v1/webhooks/didit" },
          { id: "dest_2", url: "https://outro.example/webhooks" },
        ]),
      );
      global.fetch = fetchMock;

      const service = new DiditService(buildConfigService({}), buildIntegrationHealthMock());
      const resultado = await service.listWebhookDestinations();

      expect(resultado).toEqual([
        { id: "dest_1", url: "https://api.rotta.com.br/v1/webhooks/didit" },
        { id: "dest_2", url: "https://outro.example/webhooks" },
      ]);
      const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(url).toBe("https://verification.didit.me/v3/webhook/destinations/");
      expect(options.method).toBe("GET");
    });

    it("aceita uma resposta paginada em { results: [...] }", async () => {
      const fetchMock = jest
        .fn()
        .mockResolvedValueOnce(
          jsonResponse({ results: [{ id: "dest_1", url: "https://api.rotta.com.br/webhooks" }] }),
        );
      global.fetch = fetchMock;

      const service = new DiditService(buildConfigService({}), buildIntegrationHealthMock());
      const resultado = await service.listWebhookDestinations();

      expect(resultado).toEqual([{ id: "dest_1", url: "https://api.rotta.com.br/webhooks" }]);
    });

    it("aceita uma resposta paginada em { data: [...] }", async () => {
      const fetchMock = jest
        .fn()
        .mockResolvedValueOnce(
          jsonResponse({ data: [{ id: "dest_1", url: "https://api.rotta.com.br/webhooks" }] }),
        );
      global.fetch = fetchMock;

      const service = new DiditService(buildConfigService({}), buildIntegrationHealthMock());
      const resultado = await service.listWebhookDestinations();

      expect(resultado).toEqual([{ id: "dest_1", url: "https://api.rotta.com.br/webhooks" }]);
    });

    it("lança um erro claro quando a resposta não é uma lista reconhecida", async () => {
      const fetchMock = jest.fn().mockResolvedValueOnce(jsonResponse({ unexpected: true }));
      global.fetch = fetchMock;

      const service = new DiditService(buildConfigService({}), buildIntegrationHealthMock());

      await expect(service.listWebhookDestinations()).rejects.toThrow("lista reconhecida");
    });

    it("recusa quando DIDIT_API_KEY não está configurada", async () => {
      const service = new DiditService(
        buildConfigService({ apiKey: undefined }),
        buildIntegrationHealthMock(),
      );

      await expect(service.listWebhookDestinations()).rejects.toThrow(ServiceUnavailableException);
    });
  });

  describe("createWebhookDestination", () => {
    it("envia label/url/webhook_version/subscribed_events e devolve id/secret", async () => {
      const fetchMock = jest
        .fn()
        .mockResolvedValueOnce(jsonResponse({ id: "dest_1", secret_shared_key: "segredo-novo" }));
      global.fetch = fetchMock;

      const service = new DiditService(buildConfigService({}), buildIntegrationHealthMock());
      const resultado = await service.createWebhookDestination(
        "https://api.rotta.com.br/v1/webhooks/didit",
        ["status.updated"],
        "Rotta (auto)",
      );

      expect(resultado).toEqual({ id: "dest_1", secret: "segredo-novo" });
      const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(url).toBe("https://verification.didit.me/v3/webhook/destinations/");
      expect(options.method).toBe("POST");
      expect(JSON.parse(options.body as string)).toEqual({
        label: "Rotta (auto)",
        url: "https://api.rotta.com.br/v1/webhooks/didit",
        webhook_version: "v3",
        subscribed_events: ["status.updated"],
      });
    });

    it("lança um erro claro quando a resposta não traz secret_shared_key", async () => {
      const fetchMock = jest.fn().mockResolvedValueOnce(jsonResponse({ id: "dest_1" }));
      global.fetch = fetchMock;

      const service = new DiditService(buildConfigService({}), buildIntegrationHealthMock());

      await expect(
        service.createWebhookDestination(
          "https://api.rotta.com.br/webhooks",
          ["status.updated"],
          "Rotta",
        ),
      ).rejects.toThrow("secret_shared_key");
    });

    it("recusa quando DIDIT_API_KEY não está configurada", async () => {
      const service = new DiditService(
        buildConfigService({ apiKey: undefined }),
        buildIntegrationHealthMock(),
      );

      await expect(
        service.createWebhookDestination(
          "https://api.rotta.com.br/webhooks",
          ["status.updated"],
          "Rotta",
        ),
      ).rejects.toThrow(ServiceUnavailableException);
    });
  });
});
