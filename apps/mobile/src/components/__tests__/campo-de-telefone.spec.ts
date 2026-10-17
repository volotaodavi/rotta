import { isValidBrazilianMobile, normalizarTelefone } from "@rotta/validators";

import { propsDeTelefone } from "../campo-de-telefone";

/**
 * O celular é login e é chave de pareamento. Estes testes travam as
 * duas garantias de que o resto do sistema depende:
 *
 * 1. O que fica no estado da tela é só dígito, sempre — é isso que vai
 *    pra API, e é com isso que o backend compara.
 * 2. O que a pessoa lê é a máscara, sempre — sem ela, ninguém confere
 *    onze dígitos seguidos.
 *
 * A máscara mora em `@rotta/ui/shared/telefone`, compartilhada com o
 * `PhoneInput` da web, pelo mesmo motivo: duas máscaras diferentes
 * voltariam a produzir dois formatos do mesmo número.
 */
describe("propsDeTelefone", () => {
  function digitar(inicial: string, texto: string): string {
    let guardado = inicial;
    const props = propsDeTelefone(inicial, (digitos) => {
      guardado = digitos;
    });
    props.onChangeText?.(texto);
    return guardado;
  }

  it("guarda só dígitos, qualquer que seja o que a pessoa digite ou cole", () => {
    expect(digitar("", "(21) 99709-9557")).toBe("21997099557");
    expect(digitar("", "21 99709 9557")).toBe("21997099557");
    expect(digitar("", "21997099557")).toBe("21997099557");
  });

  it("para nos 11 dígitos em vez de aceitar um número impossível", () => {
    /* Sem o limite, colar o número com +55 na frente grava
       "5521997099557", que não é celular nenhum e nunca mais casa com
       o mesmo número gravado certo em outra tela. */
    expect(digitar("", "+55 21 99709-9557")).toBe("55219970995");
    expect(digitar("", "219970995571234")).toBe("21997099557");
  });

  it("mostra a máscara do número que está guardado", () => {
    expect(propsDeTelefone("21997099557", () => undefined).value).toBe("(21) 99709-9557");
    /* Fixo é 4+4, celular é 5+4. A máscara cortava sempre no quinto
       dígito, então todo telefone de escola e de empresa aparecia como
       `(21) 33334-444`, um número que não existe. */
    expect(propsDeTelefone("2133334444", () => undefined).value).toBe("(21) 3333-4444");
    expect(propsDeTelefone("21", () => undefined).value).toBe("(21");
    expect(propsDeTelefone("", () => undefined).value).toBe("");
  });

  it("o que sai do campo é exatamente o que o backend grava", () => {
    /* Esta é a garantia que faltava e que custava a conta da pessoa: o
       valor do campo e o valor normalizado pelo servidor
       (`normalizarTelefone`, usado por `IsBrazilianMobile`) tinham que
       ser a MESMA string, não duas parecidas. */
    const doCampo = digitar("", "(21) 99709-9557");
    expect(doCampo).toBe(normalizarTelefone("(21) 99709-9557"));
    expect(isValidBrazilianMobile(doCampo)).toBe(true);
  });

  it("limita o texto visível ao tamanho da máscara cheia", () => {
    /* `maxLength` conta caracteres com máscara, não dígitos: sem ele o
       teclado aceita digitar além dos 11 dígitos e nada muda na tela,
       o que parece campo travado. */
    expect(propsDeTelefone("21997099557", () => undefined).maxLength).toBe(
      "(21) 99709-9557".length,
    );
  });
});
