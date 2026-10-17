import { registerDecorator, type ValidationOptions } from "class-validator";

/** `AAAA-MM-DD` e nada mais: sem hora, sem fuso, sem `T`. */
const FORMATO = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Um DIA do calendário, não um instante no tempo.
 *
 * ## Por que não basta `@IsDateString()`
 *
 * Porque `@IsDateString()` aceita o ISO completo
 * (`2026-09-25T23:30:00-03:00`), e os campos onde ele estava são todos
 * de dia, não de instante: o dia da escala, o dia em que o desvio de
 * endereço vale, a vigência de um contrato, a data de nascimento. A
 * documentação de cada um já dizia `AAAA-MM-DD`; a validação não
 * exigia.
 *
 * A folga tinha duas consequências, e a segunda é a grave:
 *
 * 1. **Dia trocado.** Truncar um ISO com hora em UTC leva
 *    `2026-09-25T23:30-03:00` para o dia 26, porque em UTC já é dia 26.
 *    O despachante monta a escala de quinta às 21h30 e ela nasce na
 *    sexta.
 * 2. **Data inválida silenciosa.** `StudentsService.parseDataOnly`
 *    monta `` `${data}T00:00:00.000Z` ``. Com um ISO completo na
 *    entrada isso vira `2026-09-25T10:00:00ZT00:00:00.000Z`, que o
 *    `Date` resolve como `Invalid Date` sem lançar nada. O campo em
 *    questão é o DIA EM QUE A CRIANÇA DESCE EM OUTRO ENDEREÇO.
 *
 * Com o formato exigido aqui, o cliente leva um 400 claro em vez de
 * qualquer uma das duas.
 *
 * Não use em campo que é instante de verdade (início e fim de evento
 * da Agenda, filtros de período com hora): para esses, `@IsDateString()`
 * continua sendo o certo.
 */
export function IsDiaDoCalendario(validationOptions?: ValidationOptions) {
  return function decorate(object: object, propertyName: string): void {
    registerDecorator({
      name: "isDiaDoCalendario",
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown): boolean {
          if (typeof value !== "string" || !FORMATO.test(value)) return false;

          /* O formato sozinho deixa passar 2026-02-31. `Date` normaliza
             em silêncio para 03/03, então a comparação de volta é o que
             rejeita o dia que não existe. */
          const data = new Date(`${value}T00:00:00.000Z`);
          return !Number.isNaN(data.getTime()) && data.toISOString().slice(0, 10) === value;
        },
        defaultMessage(): string {
          return "Informe a data no formato AAAA-MM-DD, sem hora.";
        },
      },
    });
  };
}
