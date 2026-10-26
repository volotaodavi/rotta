import { AppState } from "react-native";

import {
  acordarApiAoVoltarParaOPrimeiroPlano,
  esquecerUltimaChamadaDeAcordar,
} from "../acordar-api";

jest.mock("@/config/env", () => ({
  env: { EXPO_PUBLIC_API_URL: "https://api.rotta.test/v1" },
}));

/*
  O motorista abre o app as 5h40, bloqueia o celular, dirige duas horas
  e volta ao app na escola. Nesse intervalo, se nenhuma outra requisicao
  aconteceu, o servico do plano gratuito do Render hibernou (15 minutos
  de silencio) e leva perto de 90 segundos para voltar. Quem paga essa
  espera e ele, parado na porta da escola com crianca esperando para
  descer.

  Durante a viagem em andamento o relato de GPS a cada 15 segundos ja
  mantem a API acordada sozinho. O caso que sobra, e que isto cobre, e o
  app aberto ANTES de a viagem comecar e depois de ela terminar.
*/
describe("acordarApiAoVoltarParaOPrimeiroPlano", () => {
  let fetchMock: jest.Mock;
  let ouvinte: ((estado: string) => void) | undefined;
  const remove = jest.fn();

  beforeEach(() => {
    esquecerUltimaChamadaDeAcordar();
    fetchMock = jest.fn().mockResolvedValue({ ok: true });
    global.fetch = fetchMock as unknown as typeof fetch;
    ouvinte = undefined;
    jest.spyOn(AppState, "addEventListener").mockImplementation(((
      _evento: string,
      handler: (estado: string) => void,
    ) => {
      ouvinte = handler;
      return { remove } as never;
    }) as never);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("volta ao primeiro plano acorda a API", () => {
    acordarApiAoVoltarParaOPrimeiroPlano();

    ouvinte?.("active");

    expect(fetchMock).toHaveBeenCalledWith("https://api.rotta.test/v1/health", { method: "GET" });
  });

  it("ir para segundo plano nao chama nada", () => {
    acordarApiAoVoltarParaOPrimeiroPlano();

    ouvinte?.("background");
    ouvinte?.("inactive");

    expect(fetchMock).not.toHaveBeenCalled();
  });

  /*
    Alternar entre apps dispara `active` varias vezes por minuto, e cada
    uma viraria uma requisicao. A cota gratuita do Render e de 750 horas
    de instancia por mes para o workspace inteiro: desperdica-la em ping
    redundante e a mesma imprudencia de manter o servico acordado 24
    horas, so que mais dificil de perceber.
  */
  it("alternar entre apps nao vira uma rajada de requisicoes", () => {
    acordarApiAoVoltarParaOPrimeiroPlano();

    ouvinte?.("active");
    ouvinte?.("background");
    ouvinte?.("active");
    ouvinte?.("active");

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  /* Dez minutos nunca deixam os 15 de hibernacao se completarem. */
  it("passados dez minutos, acorda de novo", () => {
    /* Relogio realista: o `0` nao serve porque `ultimaChamadaEm` comeca
       em zero, e aos zero milissegundos do epoch a primeira chamada
       cairia dentro da propria janela de dez minutos. */
    const base = Date.parse("2026-10-26T08:00:00.000Z");
    const agora = jest.spyOn(Date, "now");
    agora.mockReturnValue(base);
    acordarApiAoVoltarParaOPrimeiroPlano();
    ouvinte?.("active");

    agora.mockReturnValue(base + 10 * 60 * 1000 + 1);
    ouvinte?.("active");

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("devolve a funcao que cancela a inscricao", () => {
    const cancelar = acordarApiAoVoltarParaOPrimeiroPlano();

    cancelar();

    expect(remove).toHaveBeenCalled();
  });
});
