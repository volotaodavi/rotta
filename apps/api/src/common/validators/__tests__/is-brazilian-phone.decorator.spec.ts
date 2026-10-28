import { plainToInstance } from "class-transformer";
import { IsOptional, validateSync } from "class-validator";

import { IsBrazilianPhone } from "../is-brazilian-phone.decorator";

/**
 * Telefone opcional em branco.
 *
 * ## O defeito que isto trava
 *
 * Achado por um teste de ponta a ponta do cadastro, fazendo o que
 * qualquer pessoa faz: criar a conta sem preencher o WhatsApp, que é
 * marcado como opcional na tela. O formulário manda `whatsapp: ""`, e
 * `""` não é `undefined` — então `@IsOptional()` não pulava a
 * validação, e o cadastro INTEIRO era recusado com "Telefone
 * inválido", sem dizer de qual telefone se tratava.
 *
 * Era o primeiro passo do produto falhando para quem deixasse em
 * branco um campo opcional. Nenhum teste de unidade pegava: cada ponta
 * estava correta isoladamente, e o defeito vivia na junção.
 */

class CadastroDeTeste {
  @IsBrazilianPhone()
  telefone!: string;

  @IsOptional()
  @IsBrazilianPhone()
  whatsapp?: string;
}

function validar(entrada: Record<string, unknown>): {
  propriedades: string[];
  instancia: CadastroDeTeste;
} {
  const instancia = plainToInstance(CadastroDeTeste, entrada);
  const erros = validateSync(instancia, { whitelist: true, forbidNonWhitelisted: false });
  return { propriedades: erros.map((erro) => erro.property), instancia };
}

describe("campo opcional em branco", () => {
  it("passa, e o campo some em vez de virar string vazia", () => {
    const { propriedades, instancia } = validar({
      telefone: "21997099557",
      whatsapp: "",
    });

    expect(propriedades).toEqual([]);
    expect(instancia.whatsapp).toBeUndefined();
  });

  it("espaço em branco também conta como ausente", () => {
    const { propriedades } = validar({ telefone: "21997099557", whatsapp: "   " });

    expect(propriedades).toEqual([]);
  });

  it("ausente de verdade continua passando", () => {
    const { propriedades } = validar({ telefone: "21997099557" });

    expect(propriedades).toEqual([]);
  });

  it("preenchido e inválido continua reprovando", () => {
    // O conserto não é um "aceita qualquer coisa": número errado
    // continua errado.
    const { propriedades } = validar({ telefone: "21997099557", whatsapp: "123" });

    expect(propriedades).toEqual(["whatsapp"]);
  });
});

describe("campo obrigatório", () => {
  it("em branco continua reprovando", () => {
    // É aqui que o conserto poderia ter afrouxado algo, e não afrouxou:
    // `undefined` num campo obrigatório segue inválido.
    const { propriedades } = validar({ telefone: "" });

    expect(propriedades).toContain("telefone");
  });

  it("máscara é normalizada antes de validar", () => {
    // O telefone é LOGIN na Rotta: gravar "(21) 99709-9557" fazia a
    // conta nunca abrir, porque a busca é por dígitos.
    const { propriedades, instancia } = validar({ telefone: "(21) 99709-9557" });

    expect(propriedades).toEqual([]);
    expect(instancia.telefone).toBe("21997099557");
  });
});
