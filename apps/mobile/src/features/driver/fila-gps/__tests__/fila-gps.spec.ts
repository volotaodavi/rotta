/**
 * `GPS-04`/`GPS-05` — fila offline de posições.
 *
 * O que estes testes protegem é a promessa da fila: nada sai do
 * aparelho antes de o servidor confirmar. Antes dela, o app enviava
 * cada posição uma vez e descartava a falha — um túnel ou uma zona
 * rural sem sinal apagavam aquele trecho do histórico para sempre, e o
 * histórico é o que prova para a família por onde o veículo passou.
 */

const mockArquivos = new Map<string, string>();

jest.mock("expo-file-system", () => ({
  documentDirectory: "file:///documentos/",
  getInfoAsync: jest.fn((caminho: string) =>
    Promise.resolve({ exists: mockArquivos.has(caminho), uri: caminho }),
  ),
  readAsStringAsync: jest.fn((caminho: string) => Promise.resolve(mockArquivos.get(caminho) ?? "")),
  writeAsStringAsync: jest.fn((caminho: string, conteudo: string) => {
    mockArquivos.set(caminho, conteudo);
    return Promise.resolve();
  }),
}));

const mockIngest = jest.fn();

jest.mock("@/lib/api-client", () => ({
  tripsApi: {
    ingestPositionsBatch: (...args: unknown[]) => mockIngest(...args),
  },
}));

import { drenar, enfileirar, MAXIMO_DE_POSICOES, tamanhoDaFila } from "../fila-gps";

import type { PosicaoEnfileirada } from "../fila-gps.util";

const posicao = (segundo: number, tripId = "trip-1"): PosicaoEnfileirada => ({
  tripId,
  latitude: -23.0,
  longitude: -46.0,
  capturadaEm: `2026-09-19T10:00:${String(segundo).padStart(2, "0")}.000Z`,
});

beforeEach(() => {
  mockArquivos.clear();
  mockIngest.mockReset();
  mockIngest.mockResolvedValue([]);
});

describe("enfileirar", () => {
  it("acumula na ordem de captura", async () => {
    await enfileirar(posicao(0));
    await enfileirar(posicao(15));

    expect(await tamanhoDaFila()).toBe(2);
  });

  it("nunca lança quando o armazenamento falha", async () => {
    // A captura de GPS não pode morrer por causa da fila: se ela
    // falhar, o pior aceitável é voltar ao comportamento antigo (perder
    // a posição), nunca derrubar o rastreamento inteiro.
    const FileSystem = jest.requireMock("expo-file-system") as {
      writeAsStringAsync: jest.Mock;
    };
    FileSystem.writeAsStringAsync.mockRejectedValueOnce(new Error("disco cheio"));
    const avisos = jest.spyOn(console, "warn").mockImplementation(() => undefined);

    await expect(enfileirar(posicao(0))).resolves.toBeUndefined();

    avisos.mockRestore();
  });
});

describe("drenar", () => {
  it("não chama a API com a fila vazia", async () => {
    const resultado = await drenar();

    expect(resultado).toEqual({ enviadas: 0, restantes: 0 });
    expect(mockIngest).not.toHaveBeenCalled();
  });

  it("envia o acumulado e esvazia a fila", async () => {
    await enfileirar(posicao(0));
    await enfileirar(posicao(15));

    const resultado = await drenar();

    expect(resultado).toEqual({ enviadas: 2, restantes: 0 });
    expect(mockIngest).toHaveBeenCalledWith("trip-1", [
      expect.objectContaining({ capturadaEm: "2026-09-19T10:00:00.000Z" }),
      expect.objectContaining({ capturadaEm: "2026-09-19T10:00:15.000Z" }),
    ]);
    expect(await tamanhoDaFila()).toBe(0);
  });

  it("não manda `tripId` dentro de cada posição — ele é o caminho da rota", async () => {
    await enfileirar(posicao(0));

    await drenar();

    const [, enviadas] = mockIngest.mock.calls[0] as [string, object[]];
    expect(enviadas[0]).not.toHaveProperty("tripId");
  });

  it("uma requisição por viagem quando a fila tem mais de uma", async () => {
    await enfileirar(posicao(0, "trip-1"));
    await enfileirar(posicao(15, "trip-2"));

    await drenar();

    expect(mockIngest).toHaveBeenCalledTimes(2);
    expect(mockIngest.mock.calls.map((c) => c[0])).toEqual(["trip-1", "trip-2"]);
  });

  it("PRESERVA a fila quando o envio falha", async () => {
    // Esta é a razão de a fila existir. Se ela apagasse o que não foi
    // confirmado, seria só uma maneira mais complicada de perder
    // posição.
    await enfileirar(posicao(0));
    await enfileirar(posicao(15));
    mockIngest.mockRejectedValue(new Error("sem rede"));

    const resultado = await drenar();

    expect(resultado).toEqual({ enviadas: 0, restantes: 2 });
    expect(await tamanhoDaFila()).toBe(2);
  });

  it("para na primeira viagem que falha, mas guarda o que já foi confirmado", async () => {
    await enfileirar(posicao(0, "trip-1"));
    await enfileirar(posicao(15, "trip-2"));
    mockIngest.mockResolvedValueOnce([]).mockRejectedValueOnce(new Error("sem rede"));

    const resultado = await drenar();

    expect(resultado).toEqual({ enviadas: 1, restantes: 1 });
    const restante = await tamanhoDaFila();
    expect(restante).toBe(1);
  });

  it("preserva o que foi enfileirado DURANTE o envio", async () => {
    // A task de segundo plano continua rodando enquanto a requisição
    // está no ar. Se a drenagem reescrevesse o arquivo com uma sobra
    // calculada antes do envio, a posição capturada no meio do caminho
    // sumiria — e ninguém perceberia, porque o envio teria "dado certo".
    await enfileirar(posicao(0));
    mockIngest.mockImplementation(async () => {
      await enfileirar(posicao(30));
      return [];
    });

    const resultado = await drenar();

    expect(resultado.enviadas).toBe(1);
    expect(await tamanhoDaFila()).toBe(1);
  });
});

describe("teto de armazenamento", () => {
  it("descarta o mais antigo em vez de encher o aparelho", async () => {
    // Um aparelho com defeito não pode consumir o armazenamento do
    // motorista sem limite.
    const muitas = Array.from(
      { length: MAXIMO_DE_POSICOES + 5 },
      (_, indice) => `${JSON.stringify({ ...posicao(0), capturadaEm: `n-${indice}` })}\n`,
    ).join("");
    mockArquivos.set("file:///documentos/rotta-fila-gps.jsonl", muitas);

    await enfileirar(posicao(59));

    expect(await tamanhoDaFila()).toBe(MAXIMO_DE_POSICOES);
  });
});
