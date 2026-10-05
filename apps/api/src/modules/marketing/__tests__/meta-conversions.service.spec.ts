import { MetaConversionsService } from "../meta-conversions.service";

import type { IntegrationHealthService } from "@/infra/observability/integration-health.service";

/**
 * A API de Conversões manda dados da Rotta para fora, para uma
 * plataforma de anúncio. Dois comportamentos têm que estar travados por
 * teste, porque os dois são invisíveis em revisão de código quando
 * alguém mexer aqui no futuro:
 *
 * 1. **Nenhum dado pessoal sai.** Nem e-mail, nem telefone, nem CPF,
 *    nem com hash. É o que a Política de Privacidade e a de Cookies
 *    prometem em público.
 * 2. **Sem token, nada é enviado.** Em vez de falhar barulhento, a
 *    integração fica desligada, porque ela roda dentro do webhook que
 *    confirma pagamento.
 */
describe("MetaConversionsService", () => {
  const health = {
    recordSuccess: jest.fn().mockResolvedValue(undefined),
    recordFailure: jest.fn().mockResolvedValue(undefined),
    recordNotConfigured: jest.fn().mockResolvedValue(undefined),
  } as unknown as IntegrationHealthService;

  const config = {
    accessToken: "token-de-teste",
    pixelId: "2122632155047063",
    apiVersion: "v21.0",
    testEventCode: undefined,
  };

  const compra = {
    eventId: "pending:11111111-1111-1111-1111-111111111111",
    valorCentavos: 3990,
    ocorridoEm: new Date("2026-10-05T12:00:00.000Z"),
    referenciaInterna: "11111111-1111-1111-1111-111111111111",
    atribuicao: {
      fbp: "fb.1.1696500000000.1234567890",
      fbc: "fb.1.1696500000000.IwAR0abc",
      ip: "200.1.2.3",
      userAgent: "Mozilla/5.0",
    },
  };

  let fetchMock: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    fetchMock = jest
      .fn()
      .mockResolvedValue({ ok: true, status: 200, text: () => Promise.resolve("{}") });
    global.fetch = fetchMock;
  });

  interface EventoEnviado {
    event_name: string;
    event_time: number;
    event_id: string;
    action_source: string;
    user_data: Record<string, string>;
    custom_data: { currency: string; value: number };
  }

  function eventoEnviado(): EventoEnviado {
    const [, init] = fetchMock.mock.calls[0] as [string, { body: string }];
    const corpo = JSON.parse(init.body) as { data: EventoEnviado[] };
    return corpo.data[0];
  }

  it("envia Purchase em BRL com o valor em reais, não em centavos", async () => {
    const service = new MetaConversionsService(config, health);

    await expect(service.registrarCompra(compra)).resolves.toBe(true);

    const evento = eventoEnviado();
    expect(evento.event_name).toBe("Purchase");
    expect(evento.custom_data).toEqual({ currency: "BRL", value: 39.9 });
    expect(evento.action_source).toBe("website");
  });

  it("manda o event_id para o Meta poder descartar a cópia do navegador", async () => {
    const service = new MetaConversionsService(config, health);

    await service.registrarCompra(compra);

    expect(eventoEnviado().event_id).toBe(compra.eventId);
  });

  it("usa o momento do pagamento, não o momento do envio", async () => {
    const service = new MetaConversionsService(config, health);

    await service.registrarCompra(compra);

    expect(eventoEnviado().event_time).toBe(Math.floor(compra.ocorridoEm.getTime() / 1000));
  });

  it("NUNCA envia e-mail, telefone ou CPF, nem com hash", async () => {
    const service = new MetaConversionsService(config, health);

    await service.registrarCompra(compra);

    const userData = eventoEnviado().user_data;
    expect(userData).not.toHaveProperty("em");
    expect(userData).not.toHaveProperty("ph");
    expect(userData).not.toHaveProperty("fn");
    expect(userData).not.toHaveProperty("ln");
    expect(Object.keys(userData).sort()).toEqual([
      "client_ip_address",
      "client_user_agent",
      "external_id",
      "fbc",
      "fbp",
    ]);
  });

  it("manda o external_id com hash, nunca o id interno em texto limpo", async () => {
    const service = new MetaConversionsService(config, health);

    await service.registrarCompra(compra);

    const { external_id: externalId } = eventoEnviado().user_data;
    expect(externalId).toMatch(/^[a-f0-9]{64}$/);
    expect(externalId).not.toContain(compra.referenciaInterna);
  });

  it("não envia nada quando não há token configurado", async () => {
    const service = new MetaConversionsService({ ...config, accessToken: undefined }, health);

    await expect(service.registrarCompra(compra)).resolves.toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("desiste quando não há nenhum sinal de atribuição", async () => {
    const service = new MetaConversionsService(config, health);

    const resultado = await service.registrarCompra({
      ...compra,
      referenciaInterna: null,
      atribuicao: {},
    });

    expect(resultado).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("devolve false, sem lançar, quando a rede falha", async () => {
    fetchMock.mockRejectedValue(new Error("ECONNRESET"));
    const service = new MetaConversionsService(config, health);

    await expect(service.registrarCompra(compra)).resolves.toBe(false);
  });

  it("devolve false, sem lançar, quando o Meta recusa o evento", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 400,
      text: () => Promise.resolve('{"error":{"message":"Invalid parameter"}}'),
    });
    const service = new MetaConversionsService(config, health);

    await expect(service.registrarCompra(compra)).resolves.toBe(false);
  });
});
