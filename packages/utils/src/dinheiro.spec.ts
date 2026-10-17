import { formatarCentavos, reaisParaCentavos } from "./dinheiro";

/**
 * Ler um valor em reais é a conta mais perigosa do produto.
 *
 * ## Por que estes testes existem
 *
 * Porque cinco telas de dinheiro liam o valor com
 * `Number(valor.replace(",", "."))`, e `replace` com string troca só a
 * PRIMEIRA ocorrência. Em notação brasileira o ponto é separador de
 * milhar, então:
 *
 * - `"1.234,56"` virava `"1.234.56"`, que é `NaN`.
 * - `"1.234"` virava `1.234` reais, e depois `123` centavos. Quem
 *   pedia mil duzentos e trinta e quatro reais recebia uma
 *   transferência de um real e vinte e três centavos.
 *
 * As telas são o saque do motorista, a transferência do Admin, a
 * cobrança Pix avulsa e a mensalidade do contrato. Nenhuma delas dava
 * erro: davam o número errado, que é o pior resultado possível num
 * campo de dinheiro.
 */
describe("reaisParaCentavos", () => {
  it("lê as três grafias que aparecem de verdade", () => {
    expect(reaisParaCentavos("1.234,56")).toBe(123456);
    expect(reaisParaCentavos("1234,56")).toBe(123456);
    expect(reaisParaCentavos("1234.56")).toBe(123456);
  });

  it("não confunde separador de milhar com centavos", () => {
    /* O caso que custava dinheiro: mil duzentos e trinta e quatro
       reais, e não um real e vinte e três. */
    expect(reaisParaCentavos("1.234")).toBe(123400);
    expect(reaisParaCentavos("1.234.567,89")).toBe(123456789);
    expect(reaisParaCentavos("10.000")).toBe(1000000);
  });

  it("completa o centavo escrito pela metade", () => {
    expect(reaisParaCentavos("12,5")).toBe(1250);
    expect(reaisParaCentavos("0,5")).toBe(50);
  });

  it("lê o valor inteiro, com e sem enfeite", () => {
    expect(reaisParaCentavos("660")).toBe(66000);
    expect(reaisParaCentavos("R$ 660,00")).toBe(66000);
    expect(reaisParaCentavos("  660,00  ")).toBe(66000);
    expect(reaisParaCentavos("0,00")).toBe(0);
    expect(reaisParaCentavos(",50")).toBe(50);
  });

  it("devolve null, e nunca zero, quando não dá para ler", () => {
    /* Zero fingido num campo de dinheiro é como um erro de valor
       começa: a tela acha que tem um número e segue. */
    expect(reaisParaCentavos("")).toBeNull();
    expect(reaisParaCentavos("   ")).toBeNull();
    expect(reaisParaCentavos("abc")).toBeNull();
    expect(reaisParaCentavos("12,34,56")).toBeNull();
    expect(reaisParaCentavos("-50")).toBeNull();
  });

  it("recusa valor grande demais para contar em centavos sem perder precisão", () => {
    expect(reaisParaCentavos("999999999999999999999,99")).toBeNull();
  });
});

describe("formatarCentavos", () => {
  it("escreve do jeito que a pessoa lê", () => {
    /* `\u00a0` escrito como escape, e não colado literal: é o
       espaço fixo que o `Intl` põe depois de "R$", e um espaço
       invisível no meio do fonte é impossível de conferir lendo. */
    expect(formatarCentavos(123456)).toBe("R$\u00a01.234,56");
    expect(formatarCentavos(0)).toBe("R$\u00a00,00");
    expect(formatarCentavos(66000)).toBe("R$\u00a0660,00");
  });

  it("faz a volta completa do que foi digitado", () => {
    for (const digitado of ["1.234,56", "660", "0,05", "10.000,00"]) {
      const centavos = reaisParaCentavos(digitado);
      expect(centavos).not.toBeNull();
      expect(reaisParaCentavos(formatarCentavos(centavos!))).toBe(centavos);
    }
  });
});
