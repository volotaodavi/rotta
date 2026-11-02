import type * as Location from "expo-location";

import { enfileirar, drenar } from "@/features/driver/fila-gps/fila-gps";

/**
 * A task que o SISTEMA OPERACIONAL chama com o app minimizado.
 *
 * ## Por que ela precisa de teste, e de um teste assim
 *
 * Porque ela é o único código do aplicativo que roda quando não há
 * ninguém olhando: o telefone está no bolso, a tela apagada, e o SO
 * reinicia o processo JS só para entregar um lote de posições. Se ela
 * falhar, ninguém vê — nem o motorista, nem a família. O que se percebe,
 * horas depois, é um buraco no trajeto que o aplicativo deveria provar.
 *
 * E ela já teve esse defeito. Até 19/09/2026 cada posição era enviada
 * direto e o que falhasse sumia, sob a justificativa de que "o próximo
 * lote tenta de novo" — mas não havia lote: túnel, viaduto e zona rural
 * apagavam aquele trecho para sempre.
 *
 * ## Como se testa uma coisa que o SO chama
 *
 * `TaskManager.defineTask` registra a função no escopo do módulo. O
 * mock abaixo guarda essa função quando o módulo é importado, e os
 * testes a chamam como o SO chamaria — com o mesmo formato de dado.
 */

let tarefaRegistrada:
  ((evento: { data?: unknown; error?: { message: string } | null }) => Promise<void>) | null = null;

jest.mock("expo-task-manager", () => ({
  defineTask: (_nome: string, tarefa: (evento: unknown) => Promise<void>) => {
    tarefaRegistrada = tarefa as typeof tarefaRegistrada;
  },
}));

jest.mock("@/features/driver/fila-gps/fila-gps", () => ({
  enfileirar: jest.fn().mockResolvedValue(undefined),
  drenar: jest.fn().mockResolvedValue({ enviadas: 0, restantes: 0 }),
}));

/* eslint-disable @typescript-eslint/no-require-imports -- o módulo precisa
   ser importado DEPOIS do mock, para a task ser registrada no mock. */
const { setActiveTripId } = require("../background-trip-location-task") as {
  setActiveTripId: (id: string | null) => void;
};
/* eslint-enable @typescript-eslint/no-require-imports */

const enfileirarMock = enfileirar as jest.MockedFunction<typeof enfileirar>;
const drenarMock = drenar as jest.MockedFunction<typeof drenar>;

/** Uma posição como o `expo-location` a entrega. */
function posicao(opcoes: {
  latitude: number;
  longitude: number;
  /** Em metros por segundo, que é a unidade do SO — nunca km/h. */
  velocidade?: number | null;
  instante: number;
}): Location.LocationObject {
  return {
    coords: {
      latitude: opcoes.latitude,
      longitude: opcoes.longitude,
      accuracy: 12,
      altitude: null,
      altitudeAccuracy: null,
      heading: null,
      speed: opcoes.velocidade ?? null,
    },
    timestamp: opcoes.instante,
  } as Location.LocationObject;
}

async function entregarLote(locations: Location.LocationObject[]): Promise<void> {
  if (!tarefaRegistrada) throw new Error("A task não foi registrada no import do módulo.");
  await tarefaRegistrada({ data: { locations }, error: null });
}

beforeEach(() => {
  jest.clearAllMocks();
  drenarMock.mockResolvedValue({ enviadas: 0, restantes: 0 } as never);
  setActiveTripId("viagem-1");
});

describe("a task registra o que o SO entrega", () => {
  it("grava ANTES de tentar a rede", async () => {
    // A ordem é a regra inteira: gravar primeiro e enviar depois é o
    // que torna a perda impossível, porque a escrita local não depende
    // de rede. Invertida, a posição só existe se a rede responder.
    await entregarLote([posicao({ latitude: -22.9, longitude: -42.8, instante: 1 })]);

    const gravou = enfileirarMock.mock.invocationCallOrder[0]!;
    const tentouEnviar = drenarMock.mock.invocationCallOrder[0]!;
    expect(gravou).toBeLessThan(tentouEnviar);
  });

  it("enfileira o lote inteiro, na ordem em que veio", async () => {
    await entregarLote([
      posicao({ latitude: -22.9, longitude: -42.8, instante: 1_000 }),
      posicao({ latitude: -22.91, longitude: -42.81, instante: 16_000 }),
      posicao({ latitude: -22.92, longitude: -42.82, instante: 31_000 }),
    ]);

    expect(enfileirarMock).toHaveBeenCalledTimes(3);
    const instantes = enfileirarMock.mock.calls.map((chamada) => chamada[0].capturadaEm);
    expect(instantes).toEqual([...instantes].sort());
  });

  it("converte a velocidade de metros por segundo para km/h", async () => {
    // O SO entrega m/s. Gravar sem converter mostraria um ônibus a
    // 36 km/h como se estivesse a 10.
    await entregarLote([
      posicao({ latitude: -22.9, longitude: -42.8, velocidade: 10, instante: 1 }),
    ]);

    expect(enfileirarMock.mock.calls[0]![0].velocidadeKmh).toBeCloseTo(36, 5);
  });

  it("velocidade negativa do sensor vira zero, nunca negativa", async () => {
    // `-1` é o jeito do Android dizer "não sei". Uma velocidade
    // negativa no histórico é um dado que não existe no mundo.
    await entregarLote([
      posicao({ latitude: -22.9, longitude: -42.8, velocidade: -1, instante: 1 }),
    ]);

    expect(enfileirarMock.mock.calls[0]![0].velocidadeKmh).toBe(0);
  });

  it("sem velocidade, o campo não é inventado", async () => {
    await entregarLote([
      posicao({ latitude: -22.9, longitude: -42.8, velocidade: null, instante: 1 }),
    ]);

    expect(enfileirarMock.mock.calls[0]![0].velocidadeKmh).toBeUndefined();
  });
});

describe("sem rede, nada se perde", () => {
  it("a posição já está gravada quando a drenagem falha", async () => {
    // O cenário do túnel. `drenar` falha, e a task NÃO pode morrer por
    // isso: o que importa — a posição — já está no disco.
    drenarMock.mockRejectedValue(new Error("sem rede"));

    await expect(
      entregarLote([posicao({ latitude: -22.9, longitude: -42.8, instante: 1 })]),
    ).resolves.toBeUndefined();

    expect(enfileirarMock).toHaveBeenCalledTimes(1);
  });

  it("o lote seguinte continua sendo gravado depois de uma falha de rede", async () => {
    // É isto que faz o acúmulo existir: a fila cresce enquanto não há
    // sinal, e sai inteira na primeira entrega depois que ele volta.
    drenarMock.mockRejectedValueOnce(new Error("sem rede"));

    await entregarLote([posicao({ latitude: -22.9, longitude: -42.8, instante: 1 })]);
    await entregarLote([posicao({ latitude: -22.91, longitude: -42.81, instante: 16_000 })]);

    expect(enfileirarMock).toHaveBeenCalledTimes(2);
    expect(drenarMock).toHaveBeenCalledTimes(2);
  });
});

describe("o que a task se recusa a fazer", () => {
  it("viagem encerrada: não grava posição nenhuma", async () => {
    // O SO pode entregar um lote em trânsito depois de a viagem
    // acabar. Gravar isso colocaria a criança dentro de um ônibus que
    // já terminou a rota.
    setActiveTripId(null);

    await entregarLote([posicao({ latitude: -22.9, longitude: -42.8, instante: 1 })]);

    expect(enfileirarMock).not.toHaveBeenCalled();
    expect(drenarMock).not.toHaveBeenCalled();
  });

  it("erro do sistema operacional: descarta o lote em silêncio", async () => {
    // Permissão revogada com o app em segundo plano, por exemplo. Não
    // há o que fazer além de descartar — e, principalmente, não travar.
    await tarefaRegistrada!({ error: { message: "permissão revogada" } });

    expect(enfileirarMock).not.toHaveBeenCalled();
  });

  it("lote vazio não vira chamada de rede", async () => {
    await entregarLote([]);

    expect(enfileirarMock).not.toHaveBeenCalled();
    expect(drenarMock).not.toHaveBeenCalled();
  });
});
