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

    await expect(service.processarChamado("Assunto", "Descrição", "DUVIDA")).rejects.toThrow(
      ServiceUnavailableException,
    );
  });

  it("separa RESUMO e RESPOSTA quando a IA segue o formato pedido", async () => {
    const service = new SupportAiService(buildConfigService("chave-secreta"));
    global.fetch = jest.fn().mockResolvedValue(
      jsonResponse({
        choices: [
          {
            message: {
              content:
                "RESUMO: Usuário não sabe cadastrar um aluno.\nRESPOSTA: Vá em Alunos > Novo.",
            },
          },
        ],
      }),
    );

    const resultado = await service.processarChamado(
      "Como cadastro um aluno?",
      "Não acho o botão.",
      "DUVIDA",
    );

    expect(resultado.resumoInterno).toBe("Usuário não sabe cadastrar um aluno.");
    expect(resultado.respostaTenant).toBe("Vá em Alunos > Novo.");
    const [url, options] = (global.fetch as jest.Mock).mock.calls[0]!;
    expect(url).toBe("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions");
    expect(options.headers.Authorization).toBe("Bearer chave-secreta");
    const body = JSON.parse(options.body);
    expect(body.messages[1].content).toContain("Categoria:");
    expect(body.messages[1].content).toContain("Como cadastro um aluno?");
  });

  it("cai num fallback honesto quando a IA não segue o formato RESUMO/RESPOSTA", async () => {
    const service = new SupportAiService(buildConfigService("chave-secreta"));
    global.fetch = jest
      .fn()
      .mockResolvedValue(
        jsonResponse({ choices: [{ message: { content: "Só um texto solto, sem marcadores." } }] }),
      );

    const resultado = await service.processarChamado("Assunto", "Descrição", "OUTRO");

    expect(resultado.respostaTenant).toBe("Só um texto solto, sem marcadores.");
    expect(resultado.resumoInterno).toBe("Só um texto solto, sem marcadores.");
  });

  it("nunca lança quando a IA responde HTTP não-ok — recusa com erro claro", async () => {
    const service = new SupportAiService(buildConfigService("chave-secreta"));
    global.fetch = jest.fn().mockResolvedValue(jsonResponse({}, false, 500));

    await expect(
      service.processarChamado("Assunto", "Descrição", "PROBLEMA_TECNICO"),
    ).rejects.toThrow(ServiceUnavailableException);
  });

  it("recusa quando a IA responde sem conteúdo (choices vazio)", async () => {
    const service = new SupportAiService(buildConfigService("chave-secreta"));
    global.fetch = jest.fn().mockResolvedValue(jsonResponse({ choices: [] }));

    await expect(service.processarChamado("Assunto", "Descrição", "COBRANCA")).rejects.toThrow(
      ServiceUnavailableException,
    );
  });

  it("recusa quando a chamada falha de rede", async () => {
    const service = new SupportAiService(buildConfigService("chave-secreta"));
    global.fetch = jest.fn().mockRejectedValue(new Error("network down"));

    await expect(service.processarChamado("Assunto", "Descrição", "DUVIDA")).rejects.toThrow(
      ServiceUnavailableException,
    );
  });
});
