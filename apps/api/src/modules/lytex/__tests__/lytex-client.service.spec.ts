import { InternalServerErrorException } from "@nestjs/common";

import { LytexClientService } from "../lytex-client.service";

import type { IntegrationHealthService } from "@/infra/observability/integration-health.service";

const config = {
  clientId: "id-da-integracao",
  clientSecret: "segredo-da-integracao",
  baseUrl: "https://sandbox-api-pay.lytex.test",
  webhookToken: "token",
  rottaRecipientId: "rec_rotta",
};

function respostaOk(corpo: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: () => Promise.resolve(JSON.stringify(corpo)),
  } as unknown as Response;
}

describe("LytexClientService", () => {
  let health: jest.Mocked<IntegrationHealthService>;
  let service: LytexClientService;
  let fetchMock: jest.Mock;

  beforeEach(() => {
    health = {
      recordSuccess: jest.fn().mockResolvedValue(undefined),
      recordFailure: jest.fn().mockResolvedValue(undefined),
      recordNotConfigured: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<IntegrationHealthService>;

    fetchMock = jest.fn();
    global.fetch = fetchMock;

    service = new LytexClientService(config, health);
  });

  function tokenValido(minutos = 5): void {
    fetchMock.mockResolvedValueOnce(
      respostaOk({
        accessToken: "tok_1",
        refreshToken: "ref_1",
        expireAt: new Date(Date.now() + minutos * 60_000).toISOString(),
        refreshExpireAt: new Date(Date.now() + 60 * 60_000).toISOString(),
      }),
    );
  }

  /*
    Sem credencial a aplicacao sobe normalmente e a chamada recusa com
    erro claro: e o mesmo padrao de stub honesto das demais integracoes
    opcionais. "Credenciais presentes" e "integracao funcionando"
    continuam sendo dois estados diferentes.
  */
  it("sem clientId/clientSecret, recusa antes de qualquer chamada", async () => {
    const semCredencial = new LytexClientService(
      { ...config, clientId: undefined, clientSecret: undefined },
      health,
    );

    expect(semCredencial.isConfigured()).toBe(false);
    await expect(semCredencial.getInvoice("inv_1")).rejects.toThrow(InternalServerErrorException);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(health.recordNotConfigured).toHaveBeenCalled();
  });

  it("autentica uma vez e reaproveita o token nas chamadas seguintes", async () => {
    tokenValido();
    fetchMock.mockResolvedValue(respostaOk({ _id: "inv_1" }));

    await service.getInvoice("inv_1");
    await service.getInvoice("inv_2");

    /* Tres idas: uma para o token, duas para as faturas. */
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[0]?.[0]).toBe(`${config.baseUrl}/v2/auth/obtain_token`);

    const [, opcoes] = fetchMock.mock.calls[1] as [string, RequestInit];
    expect((opcoes.headers as Record<string, string>).Authorization).toBe("Bearer tok_1");
  });

  /*
    O token da Lytex vale cinco minutos. Renovar antes de ele expirar
    evita a corrida em que a chamada sai com um token que morre no
    caminho e volta 410 com a cobranca ja criada do outro lado.
  */
  it("token perto de expirar e renovado antes de ser usado", async () => {
    tokenValido(0.4);
    fetchMock.mockResolvedValueOnce(respostaOk({ _id: "inv_1" }));
    await service.getInvoice("inv_1");

    tokenValido();
    fetchMock.mockResolvedValueOnce(respostaOk({ _id: "inv_2" }));
    await service.getInvoice("inv_2");

    const urls = fetchMock.mock.calls.map(([url]) => url as string);
    expect(urls.filter((url) => url.endsWith("/v2/auth/obtain_token"))).toHaveLength(2);
  });

  /*
    A unica retentativa permitida: o token em cache pode ter morrido
    entre a checagem e a chamada, e repetir nesse caso e seguro porque a
    primeira requisicao nem chegou a ser processada. Qualquer outro erro
    NAO e repetido, para nao arriscar uma segunda cobranca na mao de uma
    familia.
  */
  it("401 renova o token e repete a chamada uma vez", async () => {
    tokenValido();
    fetchMock.mockResolvedValueOnce(
      respostaOk({ statusCode: 401, message: "Token inválido", error: "Unauthorized" }, 401),
    );
    tokenValido();
    fetchMock.mockResolvedValueOnce(respostaOk({ _id: "inv_1" }));

    await expect(service.getInvoice("inv_1")).resolves.toEqual({ _id: "inv_1" });

    const urls = fetchMock.mock.calls.map(([url]) => url as string);
    expect(urls.filter((url) => url.endsWith("/v2/auth/obtain_token"))).toHaveLength(2);
  });

  it("erro que nao e de token nao e repetido", async () => {
    tokenValido();
    fetchMock.mockResolvedValueOnce(
      respostaOk({ statusCode: 400, message: "Emissão acima da quantidade permitida." }, 400),
    );

    await expect(service.getInvoice("inv_1")).rejects.toThrow(/acima da quantidade/);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  /* O 422 da Lytex traz os campos invalidos em `error.details`, e e la
     que esta a frase util: sem isso o log diria so "Requisição
     inválida". */
  it("erro de validacao vira a frase dos detalhes", async () => {
    tokenValido();
    fetchMock.mockResolvedValueOnce(
      respostaOk(
        {
          message: "Requisição inválida",
          error: { details: [{ message: '"client.cpfCnpj" is required' }] },
        },
        422,
      ),
    );

    await expect(service.createClient({ type: "pf", name: "X", cpfCnpj: "" })).rejects.toThrow(
      /client.cpfCnpj/,
    );
  });

  /*
    O header `subRecipientId` e o que faz a cobranca nascer EM NOME da
    subconta, com a credencial da propria plataforma. E ele que
    substitui a chave de API de terceiro que o desenho do Asaas exigia,
    e e o motivo tecnico da troca de provedora.
  */
  it("com subRecipientId, a fatura sai pela rota de subconta e com o header", async () => {
    tokenValido();
    fetchMock.mockResolvedValueOnce(respostaOk({ _id: "inv_1" }));

    await service.createInvoice(
      {
        _clientId: "cli_1",
        items: [{ name: "Transporte", quantity: 1, value: 66_000 }],
        dueDate: "2026-05-05T00:00:00.000Z",
        paymentMethods: {
          pix: { enable: true },
          boleto: { enable: false },
          creditCard: { enable: false },
        },
      },
      "sub_1",
    );

    const [url, opcoes] = fetchMock.mock.calls[1] as [string, RequestInit];
    expect(url).toBe(`${config.baseUrl}/v2/sub-accounts/invoices`);
    expect((opcoes.headers as Record<string, string>).subRecipientId).toBe("sub_1");
  });

  it("sem subRecipientId, a fatura e da conta da Rotta e nao leva o header", async () => {
    tokenValido();
    fetchMock.mockResolvedValueOnce(respostaOk({ _id: "inv_1" }));

    await service.createInvoice({
      _clientId: "cli_1",
      items: [{ name: "Transporte", quantity: 1, value: 66_000 }],
      dueDate: "2026-05-05T00:00:00.000Z",
      paymentMethods: {
        pix: { enable: true },
        boleto: { enable: false },
        creditCard: { enable: false },
      },
    });

    const [url, opcoes] = fetchMock.mock.calls[1] as [string, RequestInit];
    expect(url).toBe(`${config.baseUrl}/v2/invoices`);
    expect(opcoes.headers as Record<string, string>).not.toHaveProperty("subRecipientId");
  });

  /* O cliente e reencontrado pelo NOSSO id, nunca pelo CPF: procurar
     por documento acharia duas pessoas para o mesmo numero digitado com
     e sem pontuacao, e a familia receberia duas cobrancas. */
  it("procura o cliente pelo referenceId, e devolve null quando nao ha", async () => {
    tokenValido();
    fetchMock.mockResolvedValueOnce(respostaOk({ results: [] }));

    await expect(service.findClientByReferenceId("responsavel-1")).resolves.toBeNull();

    const [url] = fetchMock.mock.calls[1] as [string];
    expect(url).toContain("referenceId=responsavel-1");
  });

  /* Corpo vazio existe (cancelamentos). `JSON.parse("")` levanta, e
     levantar aqui faria uma operacao bem-sucedida parecer falha. */
  it("resposta sem corpo nao vira erro", async () => {
    tokenValido();
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 204,
      text: () => Promise.resolve(""),
    });

    await expect(service.cancelSubscription("sub_1")).resolves.toBeUndefined();
  });
});
