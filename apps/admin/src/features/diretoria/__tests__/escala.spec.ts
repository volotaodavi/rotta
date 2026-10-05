import { describe, expect, it } from "vitest";

import { proximoTurno, situacaoDeHoje } from "../escala";

/**
 * A escala decide o que a tela Diretoria mostra e o que os bonecos
 * fazem. Ela erra de dois jeitos difíceis de perceber olhando: no fuso
 * (quem abre o painel fora do Brasil veria outro dia) e no feriado
 * (12/10 é dia de CEO no calendário, e ninguém trabalha).
 */
describe("situacaoDeHoje", () => {
  /** Meio-dia UTC: o mesmo instante é o mesmo dia em Brasília, sem ambiguidade de virada. */
  function meioDiaUtc(data: string): Date {
    return new Date(`${data}T12:00:00Z`);
  }

  it("usa o fuso de Brasília, não o de quem está olhando", () => {
    // 02:00 UTC de terça é ainda segunda, 23:00, em Brasília.
    const madrugadaDeTerca = new Date("2026-10-06T02:00:00Z");

    expect(situacaoDeHoje(madrugadaDeTerca).iso).toBe("2026-10-05");
    expect(situacaoDeHoje(madrugadaDeTerca).turnos.map((t) => t.cargo)).toEqual(["CEO", "CTO"]);
  });

  it("dá os turnos certos em cada dia útil", () => {
    const cargos = (data: string) =>
      situacaoDeHoje(meioDiaUtc(data)).turnos.map((turno) => turno.cargo);

    expect(cargos("2026-10-05")).toEqual(["CEO", "CTO"]);
    expect(cargos("2026-10-06")).toEqual(["CTO"]);
    expect(cargos("2026-10-07")).toEqual(["CMO", "CTO"]);
    expect(cargos("2026-10-08")).toEqual(["CTO"]);
    expect(cargos("2026-10-09")).toEqual(["CFO", "CTO"]);
  });

  it("o CTO acorda todo dia útil, de plantão fora de terça e quinta", () => {
    const tipoDoCto = (data: string) =>
      situacaoDeHoje(meioDiaUtc(data)).turnos.find((turno) => turno.cargo === "CTO")?.tipo;

    expect(tipoDoCto("2026-10-05")).toBe("plantao");
    expect(tipoDoCto("2026-10-06")).toBe("completo");
    expect(tipoDoCto("2026-10-07")).toBe("plantao");
    expect(tipoDoCto("2026-10-08")).toBe("completo");
    expect(tipoDoCto("2026-10-09")).toBe("plantao");
  });

  it("fecha a companhia no fim de semana", () => {
    const sabado = situacaoDeHoje(meioDiaUtc("2026-10-10"));

    expect(sabado.turnos).toEqual([]);
    expect(sabado.motivoDeFolga).toMatch(/Fim de semana/);
  });

  it("fecha no feriado nacional, mesmo caindo em dia de turno", () => {
    // 12/10/2026 é segunda, dia do CEO, e é Nossa Senhora Aparecida.
    const feriado = situacaoDeHoje(meioDiaUtc("2026-10-12"));

    expect(feriado.turnos).toEqual([]);
    expect(feriado.feriado).toBe("Nossa Senhora Aparecida");
    expect(feriado.motivoDeFolga).toMatch(/Feriado nacional/);
  });
});

describe("proximoTurno", () => {
  it("pula fim de semana E feriado de uma vez", () => {
    /*
      Sexta 09/10. O fim de semana não conta, e a segunda seguinte
      (12/10) é Nossa Senhora Aparecida, que é dia de CEO no papel.
      Então o próximo turno de verdade é a terça, quatro dias depois.
      Esta era a asserção que eu tinha escrito errada: o teste estava
      pedindo CEO em três dias, e foi o código que estava certo.
    */
    const resultado = proximoTurno(new Date("2026-10-09T12:00:00Z"));

    expect(resultado?.emDias).toBe(4);
    expect(resultado?.turnos.map((turno) => turno.cargo)).toEqual(["CTO"]);
  });

  it("numa semana sem feriado, a sexta aponta para a segunda", () => {
    const resultado = proximoTurno(new Date("2026-10-16T12:00:00Z"));

    expect(resultado?.emDias).toBe(3);
    expect(resultado?.turnos.map((turno) => turno.cargo)).toEqual(["CEO", "CTO"]);
  });
});
