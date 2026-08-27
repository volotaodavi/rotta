import { InternalServerErrorException } from "@nestjs/common";

import { AsaasClientService } from "../asaas-client.service";

import type { AsaasConfig } from "@/config/asaas.config";
import type { IntegrationHealthService } from "@/infra/observability/integration-health.service";

function buildIntegrationHealthMock(): jest.Mocked<IntegrationHealthService> {
  return {
    recordSuccess: jest.fn().mockResolvedValue(undefined),
    recordFailure: jest.fn().mockResolvedValue(undefined),
    recordNotConfigured: jest.fn().mockResolvedValue(undefined),
    getSnapshot: jest.fn(),
    getAllSnapshots: jest.fn(),
  } as unknown as jest.Mocked<IntegrationHealthService>;
}

function buildService(config: Partial<AsaasConfig> = {}): AsaasClientService {
  return new AsaasClientService(
    {
      apiKey: "asaas_test_key",
      baseUrl: "https://api-sandbox.asaas.com/v3",
      webhookToken: "shh",
      ...config,
    },
    buildIntegrationHealthMock(),
  );
}

describe("AsaasClientService", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  describe("isConfigured", () => {
    it("retorna true quando ASAAS_API_KEY está presente", () => {
      expect(buildService().isConfigured()).toBe(true);
    });

    it("retorna false quando ASAAS_API_KEY está ausente", () => {
      expect(buildService({ apiKey: undefined }).isConfigured()).toBe(false);
    });
  });

  describe("createCustomer", () => {
    it("lança um erro claro quando a API key não está configurada, sem tentar chamar a rede", async () => {
      const fetchSpy = jest.fn();
      global.fetch = fetchSpy;

      const service = buildService({ apiKey: undefined });

      await expect(
        service.createCustomer({
          name: "Empresa X",
          cpfCnpj: "12345678000199",
          externalReference: "company-1",
        }),
      ).rejects.toThrow(InternalServerErrorException);
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it("envia o header access_token e devolve o recurso flat (sem envelope)", async () => {
      const fetchSpy = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ id: "cus_1", name: "Empresa X", cpfCnpj: "12345678000199" }),
      });
      global.fetch = fetchSpy;

      const service = buildService();
      const result = await service.createCustomer({
        name: "Empresa X",
        cpfCnpj: "12345678000199",
        externalReference: "company-1",
      });

      expect(result.id).toBe("cus_1");
      const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
      expect(url).toBe("https://api-sandbox.asaas.com/v3/customers");
      expect((init.headers as Record<string, string>).access_token).toBe("asaas_test_key");
      expect(JSON.parse(init.body as string)).toMatchObject({ externalReference: "company-1" });
    });

    it("lança um erro quando a resposta vem com {errors: [...]}", async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: () =>
          Promise.resolve({
            errors: [{ code: "invalid_cpfCnpj", description: "CPF/CNPJ inválido" }],
          }),
      });

      const service = buildService();
      await expect(
        service.createCustomer({
          name: "Empresa X",
          cpfCnpj: "111",
          externalReference: "company-1",
        }),
      ).rejects.toThrow(InternalServerErrorException);
    });
  });
});
