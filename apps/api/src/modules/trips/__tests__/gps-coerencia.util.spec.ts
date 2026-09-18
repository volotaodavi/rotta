import {
  distanciaKm,
  INTERVALO_MINIMO_MS,
  saltoIncoerente,
  VELOCIDADE_IMPLAUSIVEL_KMH,
} from "../gps-coerencia.util";

import type { PontoDeTrajeto } from "../gps-coerencia.util";

/**
 * `GPS-06`. O que estes testes protegem, em ordem de gravidade:
 *
 *  1. Que a decisão é do SERVIDOR. A auditoria de 18/09/2026 achou a
 *     regra invertida — o servidor copiava `dto.simuladoSuspeito`, ou
 *     seja, perguntava ao cliente se o GPS do cliente era confiável.
 *  2. Que o alerta é RARO. Um sinal de segurança que dispara à toa
 *     treina o Gestor a ignorá-lo, e aí não serve para nada. Por isso
 *     há caso de rua normal, de imprecisão urbana e de primeira leitura.
 */
const ponto = (latitude: number, longitude: number, isoData: string): PontoDeTrajeto => ({
  latitude,
  longitude,
  capturadaEm: new Date(isoData),
});

describe("saltoIncoerente (GPS-06)", () => {
  it("não marca a primeira leitura da viagem", () => {
    // Marcar toda largada como suspeita treinaria o Gestor a ignorar o
    // alerta — o pior desfecho possível para um sinal de segurança.
    expect(saltoIncoerente(null, ponto(-23.5616, -46.6559, "2026-09-18T12:00:00Z"))).toBe(false);
  });

  it("não marca deslocamento normal de rua", () => {
    // ~200 m em 15 s = 48 km/h. Trânsito comum.
    const antes = ponto(-23.5616, -46.6559, "2026-09-18T12:00:00Z");
    const depois = ponto(-23.5634, -46.6559, "2026-09-18T12:00:15Z");

    expect(saltoIncoerente(antes, depois)).toBe(false);
  });

  it("marca um salto de bairro em 15 segundos", () => {
    // ~11 km em 15 s ≈ 2.640 km/h. Impossível.
    const antes = ponto(-23.5616, -46.6559, "2026-09-18T12:00:00Z");
    const depois = ponto(-23.6616, -46.6559, "2026-09-18T12:00:15Z");

    expect(saltoIncoerente(antes, depois)).toBe(true);
  });

  it("ignora leituras quase simultâneas", () => {
    // Abaixo do intervalo mínimo qualquer imprecisão de metros vira
    // centenas de km/h — duas leituras no mesmo instante não provam
    // deslocamento nenhum.
    const antes = ponto(-23.5616, -46.6559, "2026-09-18T12:00:00Z");
    const depois = ponto(-23.5716, -46.6559, "2026-09-18T12:00:01Z");

    expect(INTERVALO_MINIMO_MS).toBeGreaterThan(1_000);
    expect(saltoIncoerente(antes, depois)).toBe(false);
  });

  it("não marca leitura fora de ordem — é a fila offline drenando", () => {
    // `GPS-04`: o lote reenviado depois de um túnel chega com
    // `capturadaEm` anterior à última conhecida. Isso é o sistema
    // funcionando, não fraude.
    const ultima = ponto(-23.5616, -46.6559, "2026-09-18T12:05:00Z");
    const atrasada = ponto(-23.6616, -46.6559, "2026-09-18T12:00:00Z");

    expect(saltoIncoerente(ultima, atrasada)).toBe(false);
  });

  it("tolera a imprecisão típica de GPS urbano", () => {
    // ~30 m de erro entre duas leituras paradas, 15 s de intervalo:
    // 7,2 km/h. Nunca pode alarmar.
    const antes = ponto(-23.5616, -46.6559, "2026-09-18T12:00:00Z");
    const depois = ponto(-23.56187, -46.6559, "2026-09-18T12:00:15Z");

    expect(saltoIncoerente(antes, depois)).toBe(false);
  });

  it("o teto é generoso o bastante para não confundir com excesso de velocidade", () => {
    // Esta regra pega o impossível, não o ilegal. Medir velocidade do
    // motorista é outra regra, com outro nome.
    expect(VELOCIDADE_IMPLAUSIVEL_KMH).toBeGreaterThanOrEqual(120);
  });
});

describe("distanciaKm", () => {
  it("dá zero para o mesmo ponto", () => {
    const p = ponto(-23.5616, -46.6559, "2026-09-18T12:00:00Z");
    expect(distanciaKm(p, p)).toBe(0);
  });

  it("bate com uma distância conhecida (São Paulo → Rio ≈ 360 km)", () => {
    const sp = ponto(-23.5505, -46.6333, "2026-09-18T12:00:00Z");
    const rj = ponto(-22.9068, -43.1729, "2026-09-18T12:00:00Z");

    expect(distanciaKm(sp, rj)).toBeGreaterThan(340);
    expect(distanciaKm(sp, rj)).toBeLessThan(380);
  });
});
