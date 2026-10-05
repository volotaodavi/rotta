import { MetaAdsIndisponivel, MetaAdsService } from "../meta-ads.service";

/**
 * A leitura de campanha é a única coisa que permite o CMO falar em
 * custo de aquisição sem inventar. Dois comportamentos precisam estar
 * travados:
 *
 * 1. **Sem token ou sem conta, recusa com a razão.** Um erro genérico
 *    faria o agente escrever "não consegui" no relatório; a razão faz
 *    ele escrever qual variável falta, que é acionável.
 * 2. **O custo por compra sai da divisão certa.** É o número que vai
 *    decidir verba, e errar a conta aqui é pior que não ter o número.
 */
describe("MetaAdsService", () => {
  const base = {
    accessToken: "token-capi",
    adsToken: "token-ads",
    pixelId: "2122632155047063",
    adAccountId: "act_123",
    apiVersion: "v21.0",
    testEventCode: undefined,
  };

  let fetchMock: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    fetchMock = jest.fn();
    global.fetch = fetchMock;
  });

  function responder(corpo: unknown, ok = true, status = 200): void {
    fetchMock.mockResolvedValue({
      ok,
      status,
      text: () => Promise.resolve(JSON.stringify(corpo)),
    });
  }

  it("recusa com a variável que falta quando não há conta de anúncio", async () => {
    const service = new MetaAdsService({ ...base, adAccountId: undefined });

    await expect(service.lerCampanhas()).rejects.toThrow(MetaAdsIndisponivel);
    await expect(service.lerCampanhas()).rejects.toThrow(/META_AD_ACCOUNT_ID/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("calcula custo por cadastro e por compra a partir do gasto real", async () => {
    responder({
      data: [
        {
          campaign_id: "1",
          campaign_name: "Transportadoras SP",
          spend: "300.00",
          impressions: "10000",
          clicks: "250",
          actions: [
            { action_type: "lead", value: "10" },
            { action_type: "purchase", value: "4" },
          ],
        },
      ],
    });
    const service = new MetaAdsService(base);

    const leitura = await service.lerCampanhas("last_7d");

    expect(leitura.campanhas[0].custoPorCadastroEmReais).toBe(30);
    expect(leitura.campanhas[0].custoPorCompraEmReais).toBe(75);
    expect(leitura.total.gastoEmReais).toBe(300);
    expect(leitura.total.compras).toBe(4);
    expect(leitura.total.custoPorCompraEmReais).toBe(75);
  });

  it("devolve custo nulo, nunca divisão por zero, quando não houve conversão", async () => {
    responder({
      data: [
        {
          campaign_id: "2",
          campaign_name: "Teste",
          spend: "50.00",
          impressions: "900",
          clicks: "7",
        },
      ],
    });
    const service = new MetaAdsService(base);

    const leitura = await service.lerCampanhas();

    expect(leitura.campanhas[0].custoPorCompraEmReais).toBeNull();
    expect(leitura.total.custoPorCompraEmReais).toBeNull();
  });

  it("repassa a razão do Meta quando a permissão do token é insuficiente", async () => {
    responder({ error: { message: "(#200) Missing Permissions" } }, false, 403);
    const service = new MetaAdsService(base);

    await expect(service.lerCampanhas()).rejects.toThrow(/Missing Permissions/);
  });

  it("pausa a campanha com status PAUSED, nunca outra coisa", async () => {
    responder({ success: true });
    const service = new MetaAdsService(base);

    await expect(service.pausarCampanha("23848")).resolves.toEqual({ pausada: true });

    const [, init] = fetchMock.mock.calls[0] as [string, { method: string; body: string }];
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body)).toEqual({ status: "PAUSED" });
  });

  it("não deixa a pausa passar em silêncio quando o Meta recusa", async () => {
    responder({ error: { message: "requires ads_management permission" } }, false, 403);
    const service = new MetaAdsService(base);

    await expect(service.pausarCampanha("23848")).rejects.toThrow(/ads_management/);
  });
});
