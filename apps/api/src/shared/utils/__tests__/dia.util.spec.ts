import { readFileSync } from "node:fs";
import { join } from "node:path";

import { inicioDoDiaNaOperacao, inicioDoDiaUtc } from "../dia.util";

/**
 * O dia de trabalho, e a garantia de que ele volta a ser calculado num
 * lugar só.
 *
 * ## O defeito
 *
 * O servidor roda em UTC e o Brasil está três horas atrás. Entre 21h e
 * meia-noite de Brasília, "hoje em UTC" já é amanhã. Era essa a conta
 * que decidia qual viagem é a de hoje, qual escala vale, quem já
 * embarcou na chamada da escola e o que o despachante vê no painel —
 * e cada módulo tinha a sua própria cópia dela.
 *
 * Cinco cópias, cinco lugares para alguém consertar e esquecer um.
 */

describe("inicioDoDiaNaOperacao", () => {
  it("às 21h30 de Brasília ainda é HOJE, não amanhã", () => {
    // 28/10 às 21h30 em Brasília é 29/10 às 00h30 em UTC.
    const noturno = new Date("2026-10-29T00:30:00.000Z");

    expect(inicioDoDiaNaOperacao(noturno).toISOString()).toBe("2026-10-28T00:00:00.000Z");
    // A conta antiga, para deixar a diferença no teste e não só no texto.
    expect(inicioDoDiaUtc(noturno).toISOString()).toBe("2026-10-29T00:00:00.000Z");
  });

  it("devolve meia-noite UTC, que é como `@db.Date` guarda o dia", () => {
    const meioDia = new Date("2026-10-28T15:00:00.000Z");
    const dia = inicioDoDiaNaOperacao(meioDia);

    expect(dia.getUTCHours()).toBe(0);
    expect(dia.getUTCMinutes()).toBe(0);
    expect(dia.toISOString()).toBe("2026-10-28T00:00:00.000Z");
  });

  it("de manhã no Brasil, os dois jeitos concordam", () => {
    const manha = new Date("2026-10-28T10:00:00.000Z");

    expect(inicioDoDiaNaOperacao(manha).toISOString()).toBe(inicioDoDiaUtc(manha).toISOString());
  });
});

/**
 * Os módulos que decidem dia de OPERAÇÃO. Billing e vencimento de
 * documento ficam fora de propósito: lá o dia é uma borda de ciclo
 * mensal, não o turno de um ônibus, e mexer nisso é outra conversa.
 */
const SERVICOS_DA_OPERACAO = [
  "trips/trips.service.ts",
  "agenda/agenda.service.ts",
  "dispatch/dispatch.service.ts",
  "students/students.service.ts",
  "school-portal/school-portal.service.ts",
];

describe("ninguém refaz a conta do dia em casa", () => {
  it.each(SERVICOS_DA_OPERACAO)("%s não remonta o dia a partir de UTC", (relativo) => {
    const codigo = readFileSync(join(__dirname, "../../../modules", relativo), "utf8");

    // `Date.UTC(x.getUTCFullYear(), x.getUTCMonth(), x.getUTCDate())` é
    // a assinatura exata da cópia que causava o defeito.
    expect(codigo).not.toMatch(/Date\.UTC\(\s*\w+\.getUTCFullYear\(\)[\s\S]{0,80}getUTCDate\(\)/);
    expect(codigo).toContain("inicioDoDiaNaOperacao");
  });
});
