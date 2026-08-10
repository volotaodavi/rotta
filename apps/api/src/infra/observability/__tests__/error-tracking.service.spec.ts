import * as Sentry from "@sentry/node";

import { ErrorTrackingService } from "../error-tracking.service";

import type { ObservabilityConfig } from "@/config/observability.config";
import type { ConfigService } from "@nestjs/config";

jest.mock("@sentry/node", () => ({
  init: jest.fn(),
  captureException: jest.fn(),
}));

function buildConfigService(observability: ObservabilityConfig): ConfigService {
  return { get: jest.fn().mockReturnValue(observability) } as unknown as ConfigService;
}

describe("ErrorTrackingService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("onModuleInit", () => {
    it("loga um aviso explícito no boot quando SENTRY_DSN ausente (Dossiê 33 — mesmo padrão de SupabaseStorageService)", () => {
      const service = new ErrorTrackingService(
        buildConfigService({ sentryDsn: undefined, environment: "test" }),
      );
      const warnSpy = jest.spyOn(service["logger"], "warn").mockImplementation();

      service.onModuleInit();

      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("Rastreamento de erros"));
      expect(Sentry.init).not.toHaveBeenCalled();
    });

    it("inicializa o Sentry quando SENTRY_DSN está configurado, sem logar aviso", () => {
      const service = new ErrorTrackingService(
        buildConfigService({ sentryDsn: "https://key@sentry.io/1", environment: "production" }),
      );
      const warnSpy = jest.spyOn(service["logger"], "warn").mockImplementation();

      service.onModuleInit();

      expect(warnSpy).not.toHaveBeenCalled();
      expect(Sentry.init).toHaveBeenCalledWith(
        expect.objectContaining({
          dsn: "https://key@sentry.io/1",
          environment: "production",
          tracesSampleRate: 0,
        }),
      );
    });
  });

  describe("captureException", () => {
    it("não envia nada (no-op) quando Sentry não está configurado — nunca falha por isso", () => {
      const service = new ErrorTrackingService(
        buildConfigService({ sentryDsn: undefined, environment: "test" }),
      );
      service.onModuleInit();

      expect(() =>
        service.captureException(new Error("boom"), {
          correlationId: "c1",
          method: "GET",
          url: "/v1/x",
        }),
      ).not.toThrow();
      expect(Sentry.captureException).not.toHaveBeenCalled();
    });

    it("envia a exceção ao Sentry com correlationId/method/url quando configurado", () => {
      const service = new ErrorTrackingService(
        buildConfigService({ sentryDsn: "https://key@sentry.io/1", environment: "production" }),
      );
      service.onModuleInit();

      const error = new Error("boom");
      service.captureException(error, { correlationId: "c1", method: "GET", url: "/v1/x" });

      expect(Sentry.captureException).toHaveBeenCalledWith(
        error,
        expect.objectContaining({
          tags: { correlationId: "c1" },
          extra: { method: "GET", url: "/v1/x" },
        }),
      );
    });
  });
});
