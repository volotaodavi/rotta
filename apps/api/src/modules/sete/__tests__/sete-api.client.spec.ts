import { ServiceUnavailableException } from "@nestjs/common";

import { SeteApiClient } from "../sete-api.client";

/**
 * O cliente da API do SETE.
 *
 * ## Nenhuma chamada real, e isso é regra, não conveniência
 *
 * O código público do SETE é de 01/03/2023 e os endpoints de produção
 * ainda precisam ser confirmados com o CECATE/UFG. Um teste que
 * batesse de verdade seria um teste contra um sistema de governo a
 * partir da CI — e, se o endereço estivesse errado, contra o que
 * estivesse naquele endereço hoje.
 */

const ORIGINAL = { ...process.env };

afterEach(() => {
  process.env = { ...ORIGINAL };
  jest.restoreAllMocks();
});

function fetchFalso(resposta: Partial<Response> & { json?: () => Promise<unknown> }): jest.Mock {
  const mock = jest.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: () => Promise.resolve({}),
    ...resposta,
  });
  globalThis.fetch = mock as typeof fetch;
  return mock;
}

describe("desligado por padrão", () => {
  it("recusa antes de abrir conexão, e diz o nome da variável", async () => {
    // "Erro inesperado" aqui mandaria alguém caçar defeito onde há uma
    // configuração ausente de propósito.
    delete process.env.SETE_SYNC_ENABLED;
    const chamou = fetchFalso({});

    await expect(new SeteApiClient().autenticar("a@b.c", "x")).rejects.toThrow(/SETE_SYNC_ENABLED/);
    expect(chamou).not.toHaveBeenCalled();
  });

  it("ligado sem endereço também recusa — não adivinha a URL", async () => {
    process.env.SETE_SYNC_ENABLED = "true";
    delete process.env.SETE_API_URL;

    await expect(new SeteApiClient().autenticar("a@b.c", "x")).rejects.toThrow(/SETE_API_URL/);
  });
});

describe("ligado, contra mock", () => {
  beforeEach(() => {
    process.env.SETE_SYNC_ENABLED = "true";
    process.env.SETE_API_URL = "https://sete.example.test/api/";
  });

  it("autentica e devolve o token", async () => {
    fetchFalso({ json: () => Promise.resolve({ access_token: "tok-123" }) });

    await expect(new SeteApiClient().autenticar("a@b.c", "x")).resolves.toBe("tok-123");
  });

  it("corta a barra sobrando da URL base", async () => {
    // `https://x/api/` + `/authenticator` daria `//authenticator`, que
    // alguns servidores tratam como rota diferente.
    const chamou = fetchFalso({ json: () => Promise.resolve({ token: "t" }) });

    await new SeteApiClient().autenticar("a@b.c", "x");

    expect(chamou.mock.calls[0]![0]).toBe("https://sete.example.test/api/authenticator/sete");
  });

  it("resposta sem token diz que o formato mudou, não 'erro'", async () => {
    fetchFalso({ json: () => Promise.resolve({ qualquer: "coisa" }) });

    await expect(new SeteApiClient().autenticar("a@b.c", "x")).rejects.toThrow(/formato/i);
  });

  it("401 fala em token expirado", async () => {
    fetchFalso({ ok: false, status: 401 });

    await expect(new SeteApiClient().enviar("rotas", "3302700", "tok", [])).rejects.toThrow(
      /expirou/i,
    );
  });

  it("422 repassa a lista de validações do SETE", async () => {
    fetchFalso({
      ok: false,
      status: 422,
      json: () => Promise.resolve({ messages: ["O campo nivel do aluno está ausente!"] }),
    });

    await expect(new SeteApiClient().enviar("alunos", "3302700", "tok", [{}])).rejects.toThrow(
      /nivel do aluno/,
    );
  });

  it("o token vai no header Authorization", async () => {
    const chamou = fetchFalso({});

    await new SeteApiClient().enviar("veiculos", "3302700", "tok-abc", [{ placa: "RTA1E23" }]);

    const opcoes = chamou.mock.calls[0]![1] as RequestInit;
    expect((opcoes.headers as Record<string, string>).Authorization).toBe("tok-abc");
  });

  it("erro genérico do SETE não é traduzido para uma causa inventada", async () => {
    fetchFalso({ ok: false, status: 503 });

    await expect(new SeteApiClient().enviar("rotas", "3302700", "tok", [])).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });
});
