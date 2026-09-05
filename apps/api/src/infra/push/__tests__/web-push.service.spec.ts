import { ServiceUnavailableException } from "@nestjs/common";
import webpush from "web-push";

import { WebPushService } from "../web-push.service";

import type { ConfigService } from "@nestjs/config";

jest.mock("web-push", () => ({
  __esModule: true,
  default: {
    setVapidDetails: jest.fn(),
    sendNotification: jest.fn(),
  },
}));

const mockedWebpush = webpush as jest.Mocked<typeof webpush>;

function buildConfigService(
  overrides: Partial<{
    vapidPublicKey: string;
    vapidPrivateKey: string;
    vapidSubject: string;
  }> = {},
): ConfigService {
  return {
    get: jest.fn().mockReturnValue({
      vapidPublicKey: "public-key",
      vapidPrivateKey: "private-key",
      vapidSubject: "mailto:rottadobrasil@gmail.com",
      ...overrides,
    }),
  } as unknown as ConfigService;
}

const SUBSCRIPTION = JSON.stringify({
  endpoint: "https://push.example.com/abc",
  keys: { p256dh: "chave-p256dh", auth: "chave-auth" },
});

describe("WebPushService", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("recusa o envio com erro claro quando VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY não estão configuradas", async () => {
    const service = new WebPushService(
      buildConfigService({ vapidPublicKey: undefined, vapidPrivateKey: undefined }),
    );

    await expect(service.sendToTokens([SUBSCRIPTION], "Título", "Corpo")).rejects.toThrow(
      ServiceUnavailableException,
    );
    expect(mockedWebpush.sendNotification).not.toHaveBeenCalled();
  });

  it("envia a notificação pra cada PushSubscription com sucesso", async () => {
    const service = new WebPushService(buildConfigService());
    mockedWebpush.sendNotification.mockResolvedValue({} as never);

    const resultado = await service.sendToTokens([SUBSCRIPTION], "Título", "Corpo");

    expect(mockedWebpush.setVapidDetails).toHaveBeenCalledWith(
      "mailto:rottadobrasil@gmail.com",
      "public-key",
      "private-key",
    );
    expect(mockedWebpush.sendNotification).toHaveBeenCalledWith(
      JSON.parse(SUBSCRIPTION),
      expect.stringContaining("Título"),
    );
    expect(resultado).toEqual({ sucesso: [SUBSCRIPTION], invalidos: [] });
  });

  it("marca como inválida uma subscription que o navegador reporta como morta (HTTP 410)", async () => {
    const service = new WebPushService(buildConfigService());
    mockedWebpush.sendNotification.mockRejectedValue(
      Object.assign(new Error("Gone"), { statusCode: 410 }),
    );

    const resultado = await service.sendToTokens([SUBSCRIPTION], "Título", "Corpo");

    expect(resultado).toEqual({ sucesso: [], invalidos: [SUBSCRIPTION] });
  });

  it("um token que não é JSON válido é descartado como inválido, sem lançar", async () => {
    const service = new WebPushService(buildConfigService());

    const resultado = await service.sendToTokens(["não é json"], "Título", "Corpo");

    expect(resultado).toEqual({ sucesso: [], invalidos: ["não é json"] });
    expect(mockedWebpush.sendNotification).not.toHaveBeenCalled();
  });

  it("uma falha transitória (não 404/410) nunca é tratada como token inválido", async () => {
    const service = new WebPushService(buildConfigService());
    mockedWebpush.sendNotification.mockRejectedValue(
      Object.assign(new Error("Timeout"), { statusCode: 500 }),
    );

    const resultado = await service.sendToTokens([SUBSCRIPTION], "Título", "Corpo");

    expect(resultado).toEqual({ sucesso: [], invalidos: [] });
  });
});
