import { ExpoPushService } from "../expo-push.service";

import type { ConfigService } from "@nestjs/config";

function jsonResponse(body: unknown, ok = true, status = 200): Response {
  return {
    ok,
    status,
    json: () => Promise.resolve(body),
  } as unknown as Response;
}

function buildConfigService(expoAccessToken?: string): ConfigService {
  return {
    get: jest.fn().mockReturnValue({ expoAccessToken }),
  } as unknown as ConfigService;
}

describe("ExpoPushService", () => {
  const originalFetch = global.fetch;
  let service: ExpoPushService;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.resetAllMocks();
  });

  it("envia pro endpoint do Expo sem Authorization quando EXPO_ACCESS_TOKEN não está configurado", async () => {
    service = new ExpoPushService(buildConfigService());
    global.fetch = jest
      .fn()
      .mockResolvedValue(jsonResponse({ data: [{ status: "ok" }, { status: "ok" }] }));

    const resultado = await service.sendToTokens(
      ["ExponentPushToken[a]", "ExponentPushToken[b]"],
      "Título",
      "Corpo",
    );

    expect(resultado).toEqual({
      sucesso: ["ExponentPushToken[a]", "ExponentPushToken[b]"],
      invalidos: [],
    });
    const [, options] = (global.fetch as jest.Mock).mock.calls[0]!;
    expect(options.headers.Authorization).toBeUndefined();
  });

  it("inclui Authorization quando EXPO_ACCESS_TOKEN está configurado", async () => {
    service = new ExpoPushService(buildConfigService("token-secreto"));
    global.fetch = jest.fn().mockResolvedValue(jsonResponse({ data: [{ status: "ok" }] }));

    await service.sendToTokens(["ExponentPushToken[a]"], "Título", "Corpo");

    const [, options] = (global.fetch as jest.Mock).mock.calls[0]!;
    expect(options.headers.Authorization).toBe("Bearer token-secreto");
  });

  it("marca como inválido um token com details.error DeviceNotRegistered", async () => {
    service = new ExpoPushService(buildConfigService());
    global.fetch = jest.fn().mockResolvedValue(
      jsonResponse({
        data: [{ status: "error", details: { error: "DeviceNotRegistered" } }],
      }),
    );

    const resultado = await service.sendToTokens(["ExponentPushToken[morto]"], "Título", "Corpo");

    expect(resultado).toEqual({ sucesso: [], invalidos: ["ExponentPushToken[morto]"] });
  });

  it("nunca lança quando o Expo responde HTTP não-ok — só loga e considera o lote sem sucesso", async () => {
    service = new ExpoPushService(buildConfigService());
    global.fetch = jest.fn().mockResolvedValue(jsonResponse({}, false, 500));

    const resultado = await service.sendToTokens(["ExponentPushToken[a]"], "Título", "Corpo");

    expect(resultado).toEqual({ sucesso: [], invalidos: [] });
  });

  it("divide em lotes de até 100 tokens por requisição", async () => {
    service = new ExpoPushService(buildConfigService());
    const tokens = Array.from({ length: 150 }, (_, i) => `ExponentPushToken[${i}]`);
    global.fetch = jest.fn().mockImplementation((_url, options) => {
      const enviados = JSON.parse(options.body as string) as unknown[];
      return Promise.resolve(jsonResponse({ data: enviados.map(() => ({ status: "ok" })) }));
    });

    const resultado = await service.sendToTokens(tokens, "Título", "Corpo");

    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect(resultado.sucesso).toHaveLength(150);
  });
});
