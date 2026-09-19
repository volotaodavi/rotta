import {
  agruparPorViagem,
  descartarPrimeirasLinhas,
  manterUltimas,
  parsear,
  serializar,
} from "../fila-gps.util";

import type { PosicaoEnfileirada } from "../fila-gps.util";

const posicao = (capturadaEm: string, tripId = "trip-1"): PosicaoEnfileirada => ({
  tripId,
  latitude: -23.0,
  longitude: -46.0,
  capturadaEm,
});

describe("serializar/parsear", () => {
  it("volta igual ao que entrou", () => {
    const original = posicao("2026-09-19T10:00:00.000Z");
    expect(parsear(serializar(original))).toEqual([original]);
  });

  it("descarta linha ilegível sem perder as vizinhas", () => {
    // O caso real: a bateria acabou no meio de uma escrita e cortou a
    // linha ao meio. Perder uma posição é aceitável; travar a fila
    // inteira por causa dela não é.
    const conteudo =
      serializar(posicao("2026-09-19T10:00:00.000Z")) +
      '{"tripId":"trip-1","lat\n' +
      serializar(posicao("2026-09-19T10:00:15.000Z"));

    const lidas = parsear(conteudo);

    expect(lidas).toHaveLength(2);
    expect(lidas.map((p) => p.capturadaEm)).toEqual([
      "2026-09-19T10:00:00.000Z",
      "2026-09-19T10:00:15.000Z",
    ]);
  });

  it("descarta posição sem coordenada ou sem viagem", () => {
    // Enviar isso só geraria 400 repetido até alguém limpar a fila.
    const conteudo = [
      '{"tripId":"trip-1","latitude":-23,"capturadaEm":"2026-09-19T10:00:00.000Z"}',
      '{"latitude":-23,"longitude":-46,"capturadaEm":"2026-09-19T10:00:00.000Z"}',
      '{"tripId":"trip-1","latitude":null,"longitude":-46,"capturadaEm":"2026-09-19T10:00:00.000Z"}',
      "",
    ].join("\n");

    expect(parsear(conteudo)).toEqual([]);
  });

  it("aceita arquivo vazio", () => {
    expect(parsear("")).toEqual([]);
  });
});

describe("agruparPorViagem", () => {
  it("separa viagens preservando a ordem de captura dentro de cada uma", () => {
    // Acontece quando o motorista termina uma rota e começa outra ainda
    // sem sinal: as duas viagens ficam na mesma fila.
    const grupos = agruparPorViagem([
      posicao("2026-09-19T10:00:00.000Z", "trip-1"),
      posicao("2026-09-19T10:00:15.000Z", "trip-2"),
      posicao("2026-09-19T10:00:30.000Z", "trip-1"),
    ]);

    expect([...grupos.keys()]).toEqual(["trip-1", "trip-2"]);
    expect(grupos.get("trip-1")?.map((p) => p.capturadaEm)).toEqual([
      "2026-09-19T10:00:00.000Z",
      "2026-09-19T10:00:30.000Z",
    ]);
    expect(grupos.get("trip-2")).toHaveLength(1);
  });
});

describe("descartarPrimeirasLinhas", () => {
  it("tira só o prefixo enviado e preserva o que chegou depois", () => {
    // O ponto central da fila: enquanto a requisição acontecia, a task
    // de segundo plano pode ter enfileirado posições novas no FIM do
    // arquivo. Reescrever com uma sobra calculada antes do envio as
    // perderia.
    const conteudo =
      serializar(posicao("2026-09-19T10:00:00.000Z")) +
      serializar(posicao("2026-09-19T10:00:15.000Z")) +
      serializar(posicao("2026-09-19T10:00:30.000Z"));

    const restante = parsear(descartarPrimeirasLinhas(conteudo, 2));

    expect(restante.map((p) => p.capturadaEm)).toEqual(["2026-09-19T10:00:30.000Z"]);
  });

  it("esvazia quando tudo foi enviado", () => {
    const conteudo = serializar(posicao("2026-09-19T10:00:00.000Z"));
    expect(descartarPrimeirasLinhas(conteudo, 5)).toBe("");
  });

  it("não mexe em nada quando nada foi enviado", () => {
    const conteudo = serializar(posicao("2026-09-19T10:00:00.000Z"));
    expect(descartarPrimeirasLinhas(conteudo, 0)).toBe(conteudo);
  });
});

describe("manterUltimas", () => {
  it("corta o MAIS ANTIGO quando estoura o teto", () => {
    // Numa ausência longa de sinal, o trecho recente é o que ainda tem
    // chance de importar para quem pergunta "onde o ônibus está agora".
    const conteudo = ["a", "b", "c"]
      .map((letra, indice) => serializar(posicao(`2026-09-19T10:00:0${indice}.000Z`, letra)))
      .join("");

    const mantidas = parsear(manterUltimas(conteudo, 2));

    expect(mantidas.map((p) => p.tripId)).toEqual(["b", "c"]);
  });

  it("não mexe quando cabe no teto", () => {
    const conteudo = serializar(posicao("2026-09-19T10:00:00.000Z"));
    expect(manterUltimas(conteudo, 10)).toBe(conteudo);
  });

  it("aceita arquivo vazio", () => {
    expect(manterUltimas("", 10)).toBe("");
  });
});
