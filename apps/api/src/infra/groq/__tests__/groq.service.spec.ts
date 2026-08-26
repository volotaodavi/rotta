import { ServiceUnavailableException } from "@nestjs/common";

import { GroqService } from "../groq.service";

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
      baseUrl: "https://api.groq.com/openai/v1",
      model: "llama-3.3-70b-versatile",
    }),
  } as unknown as ConfigService;
}

describe("GroqService", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.resetAllMocks();
  });

  it("recusa com erro claro quando GROQ_API_KEY não está configurada", async () => {
    const service = new GroqService(buildConfigService(undefined));

    await expect(service.responderDuvida("Assunto", "Descrição")).rejects.toThrow(
      ServiceUnavailableException,
    );
  });

  it("responde com o conteúdo da Groq quando a chave está configurada", async () => {
    const service = new GroqService(buildConfigService("chave-secreta"));
    global.fetch = jest.fn().mockResolvedValue(
      jsonResponse({ choices: [{ message: { content: "Vá em Alunos > Novo." } }] }),
    );

    const resposta = await service.responderDuvida("Como cadastro um aluno?", "Não acho o botão.");

    expect(resposta).toBe("Vá em Alunos > Novo.");
    const [url, options] = (global.fetch as jest.Mock).mock.calls[0]!;
    expect(url).toBe("https://api.groq.com/openai/v1/chat/completions");
    expect(options.headers.Authorization).toBe("Bearer chave-secreta");
  });

  it("nunca lança quando a Groq responde HTTP não-ok — recusa com erro claro", async () => {
    const service = new GroqService(buildConfigService("chave-secreta"));
    global.fetch = jest.fn().mockResolvedValue(jsonResponse({}, false, 500));

    await expect(service.responderDuvida("Assunto", "Descrição")).rejects.toThrow(
      ServiceUnavailableException,
    );
  });

  it("recusa quando a Groq responde sem conteúdo (choices vazio)", async () => {
    const service = new GroqService(buildConfigService("chave-secreta"));
    global.fetch = jest.fn().mockResolvedValue(jsonResponse({ choices: [] }));

    await expect(service.responderDuvida("Assunto", "Descrição")).rejects.toThrow(
      ServiceUnavailableException,
    );
  });

  it("recusa quando a chamada falha de rede", async () => {
    const service = new GroqService(buildConfigService("chave-secreta"));
    global.fetch = jest.fn().mockRejectedValue(new Error("network down"));

    await expect(service.responderDuvida("Assunto", "Descrição")).rejects.toThrow(
      ServiceUnavailableException,
    );
  });
});
