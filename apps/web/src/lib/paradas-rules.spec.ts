import {
  getStopDirection,
  ordenarParadasPorSentido,
  STOP_DIRECTION_LABEL,
} from "@rotta/api-client";
import { describe, expect, it } from "vitest";

import type { RouteStop, RouteStudent } from "@rotta/api-client";

/**
 * `ROT-07` — testa `@rotta/api-client` (`rules/paradas.ts`), não
 * `apps/web`. Mora aqui pelo mesmo motivo de
 * `api-client-timeout.spec.ts`: o pacote compartilhado não tem runner
 * próprio, e o web é um dos três consumidores desta regra.
 *
 * O que estes testes protegem (auditoria de 18/09/2026): até
 * 19/09/2026 estas funções existiam copiadas em três arquivos, dois
 * idênticos caractere por caractere. Uma divergência entre as cópias
 * não apareceria como erro — apareceria como o traçado do mapa e a
 * fila de cartões de parada discordando entre o celular e o
 * computador, com as duas telas parecendo certas.
 */

const parada = (id: string, ordem: number): RouteStop => ({ id, ordem }) as RouteStop;

const vinculo = (paradaEmbarqueId: string, paradaDesembarqueId: string): RouteStudent =>
  ({ paradaEmbarqueId, paradaDesembarqueId }) as RouteStudent;

describe("ordenarParadasPorSentido", () => {
  const paradas = [parada("escola", 3), parada("casa-a", 1), parada("casa-b", 2)];

  it("IDA: ordem cadastrada — casas primeiro, escola por último", () => {
    expect(ordenarParadasPorSentido(paradas, "IDA").map((p) => p.id)).toEqual([
      "casa-a",
      "casa-b",
      "escola",
    ]);
  });

  it("VOLTA: caminho inverso — sai da escola deixando cada aluno", () => {
    expect(ordenarParadasPorSentido(paradas, "VOLTA").map((p) => p.id)).toEqual([
      "escola",
      "casa-b",
      "casa-a",
    ]);
  });

  it("sem sentido (viagem ainda não iniciada) = ordem cadastrada", () => {
    // Antes de existir viagem não há sentido nenhum a respeitar.
    expect(ordenarParadasPorSentido(paradas, undefined).map((p) => p.id)).toEqual([
      "casa-a",
      "casa-b",
      "escola",
    ]);
  });

  it("não modifica o array recebido", () => {
    // As telas passam direto o resultado do React Query; ordenar no
    // lugar corromperia o cache.
    const original = [...paradas];
    ordenarParadasPorSentido(paradas, "VOLTA");
    expect(paradas).toEqual(original);
  });

  it("aceita lista vazia", () => {
    expect(ordenarParadasPorSentido([], "VOLTA")).toEqual([]);
  });
});

describe("getStopDirection", () => {
  it("IDA quando algum aluno embarca nela", () => {
    expect(getStopDirection(parada("casa-a", 1), [vinculo("casa-a", "escola")])).toBe("IDA");
  });

  it("VOLTA quando algum aluno desembarca nela", () => {
    expect(getStopDirection(parada("escola", 3), [vinculo("casa-a", "escola")])).toBe("VOLTA");
  });

  it("IDA_E_VOLTA quando a mesma parada serve aos dois", () => {
    // O caso que explica por que a direção NÃO pode ser um campo de
    // `RouteStop`: a escola é desembarque da ida e embarque da volta.
    expect(
      getStopDirection(parada("escola", 3), [
        vinculo("casa-a", "escola"),
        vinculo("escola", "casa-a"),
      ]),
    ).toBe("IDA_E_VOLTA");
  });

  it("null sem aluno vinculado — nunca um 'Ida' adivinhado", () => {
    expect(getStopDirection(parada("casa-a", 1), [])).toBeNull();
    expect(getStopDirection(parada("casa-a", 1), undefined)).toBeNull();
  });

  it("null quando os vínculos existem mas não apontam para esta parada", () => {
    expect(getStopDirection(parada("casa-z", 9), [vinculo("casa-a", "escola")])).toBeNull();
  });
});

describe("STOP_DIRECTION_LABEL", () => {
  it("tem rótulo para todas as direções", () => {
    expect(STOP_DIRECTION_LABEL).toEqual({
      IDA: "Ida",
      VOLTA: "Volta",
      IDA_E_VOLTA: "Ida e volta",
    });
  });
});
