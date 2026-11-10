import {
  comprimentoEmKm,
  douglasPeucker,
  haversineKm,
  montarShape,
  paraWebMercator,
  posicoesConfiaveis,
} from "../index";

import type { PosicaoParaShape } from "../index";

/**
 * A geometria da exportação para o SETE.
 *
 * ## Por que estes testes existem antes do código
 *
 * Porque esta é a única parte da integração cujo erro é SILENCIOSO. Um
 * campo errado no pacote o SETE recusa na importação, com mensagem. Uma
 * coordenada errada ele aceita de bom grado e desenha a rota no lugar
 * errado — e ninguém confere 80 rotas no mapa.
 *
 * O caso que mais assusta é a projeção: o `shape` do SETE está em
 * EPSG:3857 (metros), não em graus. Mandar graus não dá erro nenhum;
 * dá uma linha de 40 metros de comprimento perto da ilha de Null, no
 * Atlântico.
 */

function pos(
  latitude: number,
  longitude: number,
  extra: Partial<PosicaoParaShape> = {},
): PosicaoParaShape {
  return {
    latitude,
    longitude,
    capturadaEm: new Date("2026-11-10T09:00:00.000Z"),
    simuladoSuspeito: false,
    precisaoMetros: 10,
    ...extra,
  };
}

describe("haversineKm", () => {
  it("mede uma distância conhecida com erro abaixo de 1%", () => {
    // Maricá (centro) até Itaipuaçu, ~17 km em linha reta.
    const km = haversineKm(
      { latitude: -22.9192, longitude: -42.8186 },
      { latitude: -22.9655, longitude: -42.9712 },
    );

    expect(km).toBeGreaterThan(16);
    expect(km).toBeLessThan(18);
  });

  it("dois pontos iguais distam zero", () => {
    const p = { latitude: -22.9, longitude: -42.8 };
    expect(haversineKm(p, p)).toBe(0);
  });

  it("é simétrica", () => {
    const a = { latitude: -22.9, longitude: -42.8 };
    const b = { latitude: -23.1, longitude: -43.2 };
    expect(haversineKm(a, b)).toBeCloseTo(haversineKm(b, a), 9);
  });
});

describe("comprimentoEmKm", () => {
  it("soma os trechos, não mede a linha reta entre as pontas", () => {
    // Um L: ida para o sul, depois para o oeste. A linha reta entre as
    // pontas é menor que o caminho — é exatamente a diferença entre
    // "quilometragem rodada" e "distância até a escola".
    const caminho = [pos(-22.9, -42.8), pos(-23.0, -42.8), pos(-23.0, -42.9)];

    const somaDosTrechos = comprimentoEmKm(caminho);
    const linhaReta = haversineKm(caminho[0]!, caminho[2]!);

    expect(somaDosTrechos).toBeGreaterThan(linhaReta);
  });

  it("um ponto só não percorre distância nenhuma", () => {
    expect(comprimentoEmKm([pos(-22.9, -42.8)])).toBe(0);
  });

  it("lista vazia devolve zero, nunca NaN", () => {
    expect(comprimentoEmKm([])).toBe(0);
  });
});

describe("paraWebMercator", () => {
  it("converte o meridiano e a linha do Equador para a origem", () => {
    // `toEqual([0, 0])` falha aqui, e não por defeito: `ln(tan(π/4))`
    // dá -7e-10 em ponto flutuante, que são 0,7 NANÔMETROS. Exigir zero
    // exato de uma conta com logaritmo é exigir o que o IEEE 754 não
    // promete — o milímetro abaixo já é mil vezes mais rígido do que
    // qualquer GPS entrega.
    const [x, y] = paraWebMercator({ latitude: 0, longitude: 0 });
    expect(x).toBeCloseTo(0, 3);
    expect(y).toBeCloseTo(0, 3);
  });

  it("devolve METROS, não graus — é o ponto inteiro do RN-SETE-05", () => {
    const [x, y] = paraWebMercator({ latitude: -22.9192, longitude: -42.8186 });

    // Longitude -42.8 em 3857 fica na casa dos -4,7 milhões de metros.
    // Se alguém devolver -42.8 aqui, este teste pega.
    expect(Math.abs(x)).toBeGreaterThan(1_000_000);
    expect(Math.abs(y)).toBeGreaterThan(1_000_000);
    // Valores conferidos com a fórmula do Web Mercator, não estimados:
    // x = lon · R · π/180, y = R · ln(tan(π/4 + lat·π/360)), R = 6378137.
    // Precisão -3 aceita meio quilômetro, que é folga de sobra para
    // pegar qualquer troca de fórmula sem travar em arredondamento.
    expect(x).toBeCloseTo(-4_766_545, -3);
    expect(y).toBeCloseTo(-2_622_250, -3);
  });

  it("a conversão é reversível dentro de um metro", () => {
    const original = { latitude: -22.9655, longitude: -42.9712 };
    const [x] = paraWebMercator(original);
    const voltaLongitude = (x / 20_037_508.342789244) * 180;

    expect(voltaLongitude).toBeCloseTo(original.longitude, 6);
  });
});

describe("posicoesConfiaveis", () => {
  it("descarta posição marcada como simulada", () => {
    const entrada = [pos(-22.9, -42.8), pos(-22.91, -42.81, { simuladoSuspeito: true })];

    expect(posicoesConfiaveis(entrada)).toHaveLength(1);
  });

  it("descarta precisão pior que 100 metros", () => {
    const entrada = [
      pos(-22.9, -42.8, { precisaoMetros: 101 }),
      pos(-22.91, -42.81, { precisaoMetros: 100 }),
    ];

    const sobraram = posicoesConfiaveis(entrada);

    // 100 passa (o limite é "pior que 100"), 101 não.
    expect(sobraram).toHaveLength(1);
    expect(sobraram[0]!.precisaoMetros).toBe(100);
  });

  it("precisão desconhecida passa — ausência não é imprecisão", () => {
    // Uma posição sem `precisaoMetros` não diz que é ruim; diz que o
    // aparelho não informou. Descartá-la jogaria fora rota inteira de
    // rastreador que não manda esse campo.
    expect(posicoesConfiaveis([pos(-22.9, -42.8, { precisaoMetros: null })])).toHaveLength(1);
  });

  it("ordena por capturadaEm, porque o shape é uma linha", () => {
    const tarde = pos(-22.91, -42.81, { capturadaEm: new Date("2026-11-10T09:10:00.000Z") });
    const cedo = pos(-22.9, -42.8, { capturadaEm: new Date("2026-11-10T09:00:00.000Z") });

    const ordenadas = posicoesConfiaveis([tarde, cedo]);

    expect(ordenadas[0]!.capturadaEm).toEqual(cedo.capturadaEm);
  });
});

describe("douglasPeucker", () => {
  it("colapsa uma reta a dois pontos", () => {
    // Cinco pontos numa linha reta: os três do meio não acrescentam
    // nada à forma, e o SETE guarda o shape num campo JSON.
    const reta = [
      pos(-22.9, -42.8),
      pos(-22.91, -42.8),
      pos(-22.92, -42.8),
      pos(-22.93, -42.8),
      pos(-22.94, -42.8),
    ];

    expect(douglasPeucker(reta, 15)).toHaveLength(2);
  });

  it("preserva uma curva de verdade", () => {
    const curva = [pos(-22.9, -42.8), pos(-22.91, -42.9), pos(-22.92, -42.8)];

    expect(douglasPeucker(curva, 15)).toHaveLength(3);
  });

  it("nunca mexe no primeiro nem no último ponto", () => {
    const caminho = [pos(-22.9, -42.8), pos(-22.91, -42.8001), pos(-22.92, -42.8)];

    const simplificado = douglasPeucker(caminho, 15);

    expect(simplificado[0]).toEqual(caminho[0]);
    expect(simplificado[simplificado.length - 1]).toEqual(caminho[caminho.length - 1]);
  });

  it("dois pontos ou menos voltam intactos", () => {
    expect(douglasPeucker([], 15)).toEqual([]);
    const um = [pos(-22.9, -42.8)];
    expect(douglasPeucker(um, 15)).toEqual(um);
  });
});

describe("montarShape", () => {
  it("devolve GeoJSON FeatureCollection com um LineString", () => {
    const shape = montarShape([pos(-22.9, -42.8), pos(-22.91, -42.9), pos(-22.92, -42.8)]);

    expect(shape?.type).toBe("FeatureCollection");
    expect(shape?.features[0].geometry.type).toBe("LineString");
  });

  it("as coordenadas saem em metros de EPSG:3857", () => {
    const shape = montarShape([pos(-22.9, -42.8), pos(-22.91, -42.9), pos(-22.92, -42.8)]);
    const [x, y] = shape!.features[0].geometry.coordinates[0]!;

    expect(Math.abs(x)).toBeGreaterThan(1_000_000);
    expect(Math.abs(y)).toBeGreaterThan(1_000_000);
  });

  it("posição suspeita não entra no desenho", () => {
    const comSuspeita = [
      pos(-22.9, -42.8),
      pos(-10.0, -60.0, {
        simuladoSuspeito: true,
        capturadaEm: new Date("2026-11-10T09:05:00.000Z"),
      }),
      pos(-22.92, -42.8, { capturadaEm: new Date("2026-11-10T09:10:00.000Z") }),
    ];

    const shape = montarShape(comSuspeita);
    const xDeRondonia = paraWebMercator({ latitude: -10, longitude: -60 })[0];

    expect(shape!.features[0].geometry.coordinates.map(([x]) => x)).not.toContain(xDeRondonia);
  });

  it("menos de dois pontos confiáveis não vira linha nenhuma", () => {
    // Uma linha com um ponto só não é uma linha. Devolver um
    // `LineString` de um ponto faria o SETE aceitar e desenhar nada.
    expect(montarShape([pos(-22.9, -42.8)])).toBeNull();
    expect(montarShape([])).toBeNull();
  });
});
