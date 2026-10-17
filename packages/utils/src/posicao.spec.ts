import { lerPosicao } from "./posicao";

const AGORA = new Date("2026-10-17T12:00:00.000Z");

function haSegundos(segundos: number): string {
  return new Date(AGORA.getTime() - segundos * 1000).toISOString();
}

/**
 * O mapa só pode dizer "ao vivo" quando é ao vivo.
 *
 * ## Por que estes testes existem
 *
 * Porque a tela de acompanhamento desenhava o veículo sem nunca dizer
 * quando aquela posição foi capturada, e o dado já vinha da API. Com o
 * GPS do motorista parado (sinal, bateria, app encerrado pelo sistema),
 * a família via a van paradinha numa esquina e concluía que ela estava
 * parada ali. Ninguém sabia onde ela estava.
 */
describe("lerPosicao", () => {
  it("é ao vivo enquanto a posição é do último minuto", () => {
    expect(lerPosicao(haSegundos(0), AGORA).frescor).toBe("ao-vivo");
    expect(lerPosicao(haSegundos(10), AGORA).frescor).toBe("ao-vivo");
    expect(lerPosicao(haSegundos(59), AGORA).frescor).toBe("ao-vivo");
  });

  it("vira atrasada depois de um minuto, e diz há quanto tempo", () => {
    expect(lerPosicao(haSegundos(60), AGORA)).toMatchObject({
      frescor: "atrasada",
      rotulo: "Última posição há 1 min",
    });
    expect(lerPosicao(haSegundos(200), AGORA).rotulo).toBe("Última posição há 3 min");
  });

  it("admite que o GPS parou depois de cinco minutos", () => {
    const parada = lerPosicao(haSegundos(5 * 60), AGORA);
    expect(parada.frescor).toBe("parada");
    expect(parada.rotulo).toContain("última posição conhecida");

    expect(lerPosicao(haSegundos(3 * 3600), AGORA).rotulo).toBe(
      "Sem sinal há mais de 1 hora: esta é a última posição conhecida",
    );
  });

  it("não inventa posição quando não há nenhuma", () => {
    expect(lerPosicao(null, AGORA).frescor).toBe("sem-posicao");
    expect(lerPosicao(undefined, AGORA).frescor).toBe("sem-posicao");
    expect(lerPosicao("nem data", AGORA).frescor).toBe("sem-posicao");
    expect(lerPosicao(null, AGORA).idadeEmSegundos).toBeNull();
  });

  it("não diz 'há -2 minutos' quando o relógio do aparelho está adiantado", () => {
    /* O servidor carimba a hora dele e o celular compara com a dele:
       alguns segundos de diferença são normais, e uma idade negativa
       vira um rótulo sem sentido na tela. */
    const futuro = new Date(AGORA.getTime() + 120_000).toISOString();
    const leitura = lerPosicao(futuro, AGORA);
    expect(leitura.idadeEmSegundos).toBe(0);
    expect(leitura.frescor).toBe("ao-vivo");
  });
});
