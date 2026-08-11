import { InternalServerErrorException } from "@nestjs/common";

import { AbacatePayClientService } from "../abacatepay-client.service";

import type { AbacatePayConfig } from "@/config/abacatepay.config";
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

function buildService(config: Partial<AbacatePayConfig> = {}): AbacatePayClientService {
  return new AbacatePayClientService(
    {
      apiKey: "abc_prod_test",
      baseUrl: "https://api.abacatepay.com/v2",
      webhookSecret: "shh",
      ...config,
    },
    buildIntegrationHealthMock(),
  );
}

describe("AbacatePayClientService", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  describe("isConfigured", () => {
    it("retorna true quando ABACATEPAY_API_KEY está presente", () => {
      expect(buildService().isConfigured()).toBe(true);
    });

    it("retorna false quando ABACATEPAY_API_KEY está ausente", () => {
      expect(buildService({ apiKey: undefined }).isConfigured()).toBe(false);
    });
  });

  describe("listProducts", () => {
    it("lança um erro claro quando a API key não está configurada, sem tentar chamar a rede", async () => {
      const fetchSpy = jest.fn();
      global.fetch = fetchSpy;

      const service = buildService({ apiKey: undefined });

      await expect(service.listProducts()).rejects.toThrow(InternalServerErrorException);
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it("retorna data em uma resposta bem-sucedida (envelope success:true)", async () => {
      const products = [{ id: "prod_1", externalId: "rotta-mensalidade-plataforma" }];
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ data: products, success: true, error: null }),
      });

      const service = buildService();
      await expect(service.listProducts()).resolves.toEqual(products);
    });

    it("lança um erro quando o envelope vem com success:false, mesmo em HTTP 200", async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ data: null, success: false, error: "Not found" }),
      });

      const service = buildService();
      await expect(service.listProducts()).rejects.toThrow(InternalServerErrorException);
    });

    it("lança um erro quando o HTTP não é ok (ex.: 401)", async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ data: null, success: false, error: "Unauthenticated" }),
      });

      const service = buildService();
      await expect(service.listProducts()).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe("createSubscriptionCheckout", () => {
    it("envia Authorization Bearer e o body serializado", async () => {
      const fetchSpy = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            data: {
              id: "bill_1",
              externalId: "company-1",
              url: "https://app.abacatepay.com/pay/bill_1",
            },
            success: true,
            error: null,
          }),
      });
      global.fetch = fetchSpy;

      const service = buildService({ apiKey: "abc_prod_test" });
      const result = await service.createSubscriptionCheckout({
        items: [{ id: "prod_1", quantity: 1 }],
        externalId: "company-1",
        returnUrl: "https://app.rotta.com.br/empresa",
        completionUrl: "https://app.rotta.com.br/empresa?billing=success",
        methods: ["CARD"],
      });

      expect(result.url).toBe("https://app.abacatepay.com/pay/bill_1");
      const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
      expect(url).toBe("https://api.abacatepay.com/v2/subscriptions/create");
      expect((init.headers as Record<string, string>).Authorization).toBe("Bearer abc_prod_test");
      expect(JSON.parse(init.body as string)).toMatchObject({ externalId: "company-1" });
    });
  });
});
