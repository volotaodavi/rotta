import { ServiceUnavailableException } from "@nestjs/common";

import { SupportAiService } from "../support-ai.service";

import type { ConfigService } from "@nestjs/config";

function jsonResponse(body: unknown, ok = true, status = 200): Response {
  return {
    ok,
    status,
    json: () => Promise.resolve(body),
  } as unknown as Response;
}

function buildConfigService(apiKey?: string): ConfigService {
  return {
    get: jest.fn().mockReturnValue({
      apiKey,
      baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
      model: "gemini-2.0-flash",
    }),
  } as unknown as ConfigService;
}

describe("SupportAiService", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.resetAllMocks();
  });

  it("recusa com erro claro quando SUPPORT_AI_API_KEY não está configurada", async () => {
    const service = new SupportAiService(buildConfigService(undefined));

    await expect(service.responderDuvida("Assunto", "Descrição")).rejects.toThrow(
      ServiceUnavailableException,
    );
  });

  it("responde com o conteúdo da IA quando a chave está configurada", async () => {
    const service = new SupportAiService(buildConfigService("chave-secreta"));
    global.fetch = jest
      .fn()
      .mockResolvedValue(
        jsonResponse({ choices: [{ message: { content: "Vá em Alunos > Novo." } }] }),
      );

    const resposta = await service.responderDuvida("Como cadastro um aluno?", "Não acho o botão.");

    expect(resposta).toBe("Vá em Alunos > Novo.");
    const [url, options] = (global.fetch as jest.Mock).mock.calls[0]!;
    expect(url).toBe("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions");
    expect(options.headers.Authorization).toBe("Bearer chave-secreta");
  });

  it("nunca lança quando a IA responde HTTP não-ok — recusa com erro claro", async () => {
    const service = new SupportAiService(buildConfigService("chave-secreta"));
    global.fetch = jest.fn().mockResolvedValue(jsonResponse({}, false, 500));

    await expect(service.responderDuvida("Assunto", "Descrição")).rejects.toThrow(
      ServiceUnavailableException,
    );
  });

  it("recusa quando a IA responde sem conteúdo (choices vazio)", async () => {
    const service = new SupportAiService(buildConfigService("chave-secreta"));
    global.fetch = jest.fn().mockResolvedValue(jsonResponse({ choices: [] }));

    await expect(service.responderDuvida("Assunto", "Descrição")).rejects.toThrow(
      ServiceUnavailableException,
    );
  });

  it("recusa quando a chamada falha de rede", async () => {
    const service = new SupportAiService(buildConfigService("chave-secreta"));
    global.fetch = jest.fn().mockRejectedValue(new Error("network down"));

    await expect(service.responderDuvida("Assunto", "Descrição")).rejects.toThrow(
      ServiceUnavailableException,
    );
  });
});
