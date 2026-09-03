import { plainToInstance } from "class-transformer";
import { IsBoolean, IsOptional } from "class-validator";

import { ParseQueryBoolean } from "../parse-query-boolean.decorator";

class FiltroDeTeste {
  @IsOptional()
  @ParseQueryBoolean()
  @IsBoolean()
  ativo?: boolean;
}

/**
 * BUG REAL de produção (ver comentário completo em
 * `parse-query-boolean.decorator.ts`): `@Type(() => Boolean)` do
 * class-transformer faz `Boolean("false") === true` — toda query
 * string manda booleano como texto, então um filtro explícito
 * `?ativo=false` virava `true` silenciosamente. Achado exato: a
 * Central de Atendimento (Admin) sempre manda `arquivado=false` e
 * ficava permanentemente vazia porque o backend entendia "só
 * arquivados". Estes testes travam esse comportamento pra nunca mais
 * regredir — em qualquer DTO que use `@ParseQueryBoolean()`.
 */
describe("ParseQueryBoolean", () => {
  it('a string "false" (o que toda query string manda) vira o boolean false — não true', () => {
    const result = plainToInstance(FiltroDeTeste, { ativo: "false" });
    expect(result.ativo).toBe(false);
  });

  it('a string "true" vira o boolean true', () => {
    const result = plainToInstance(FiltroDeTeste, { ativo: "true" });
    expect(result.ativo).toBe(true);
  });

  it("um boolean já real (nunca passou por querystring) não é alterado", () => {
    expect(plainToInstance(FiltroDeTeste, { ativo: false }).ativo).toBe(false);
    expect(plainToInstance(FiltroDeTeste, { ativo: true }).ativo).toBe(true);
  });

  it("campo ausente continua undefined (nunca vira false/true por engano)", () => {
    const result = plainToInstance(FiltroDeTeste, {});
    expect(result.ativo).toBeUndefined();
  });

  it('um valor que não é "true"/"false" passa adiante intacto — pro @IsBoolean() do campo rejeitar, nunca mascarado', () => {
    const result = plainToInstance(FiltroDeTeste, { ativo: "sim" });
    expect(result.ativo).toBe("sim");
  });
});
