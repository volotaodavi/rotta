import { validate } from "class-validator";

import { IsDiaDoCalendario } from "../is-dia-do-calendario.decorator";

class Escala {
  @IsDiaDoCalendario()
  data!: unknown;
}

async function aceita(valor: unknown): Promise<boolean> {
  const alvo = new Escala();
  alvo.data = valor;
  return (await validate(alvo)).length === 0;
}

/**
 * O dia é um DIA, não um instante.
 *
 * ## Por que este teste existe
 *
 * Os campos que usam este decorador já diziam `AAAA-MM-DD` na
 * documentação e aceitavam o ISO completo na validação
 * (`@IsDateString()`). A folga custava das duas formas:
 *
 * - `2026-09-25T21:30:00-03:00` truncado em UTC vira dia 26. O
 *   despachante monta a escala de quinta à noite e ela nasce na sexta.
 * - `StudentsService.parseDataOnly` concatena `T00:00:00.000Z` no que
 *   recebe. Com um ISO completo, o resultado é `Invalid Date`, e o
 *   campo em questão é o dia em que a criança desce em outro endereço.
 */
describe("IsDiaDoCalendario", () => {
  it("aceita o dia no formato combinado", async () => {
    await expect(aceita("2026-09-25")).resolves.toBe(true);
    await expect(aceita("2015-03-20")).resolves.toBe(true);
    /* 2028 é bissexto; 2026 e 2025 não são, e aparecem abaixo. */
    await expect(aceita("2028-02-29")).resolves.toBe(true);
  });

  it("recusa o ISO completo, que é o que trocava o dia", async () => {
    await expect(aceita("2026-09-25T21:30:00-03:00")).resolves.toBe(false);
    await expect(aceita("2026-09-25T00:00:00.000Z")).resolves.toBe(false);
    await expect(aceita("2026-09-25T10:00:00")).resolves.toBe(false);
  });

  it("recusa dia que não existe no calendário", async () => {
    /* Só o formato deixaria passar: `new Date` normaliza 31/02 para
       03/03 em silêncio, e a escala ia parar noutro dia. */
    await expect(aceita("2026-02-31")).resolves.toBe(false);
    await expect(aceita("2026-02-29")).resolves.toBe(false);
    await expect(aceita("2026-13-01")).resolves.toBe(false);
    await expect(aceita("2025-02-29")).resolves.toBe(false);
  });

  it("recusa o que nem parece data", async () => {
    await expect(aceita("25/09/2026")).resolves.toBe(false);
    await expect(aceita("2026-9-5")).resolves.toBe(false);
    await expect(aceita("")).resolves.toBe(false);
    await expect(aceita(null)).resolves.toBe(false);
    await expect(aceita(20260925)).resolves.toBe(false);
  });
});
