import { isValidBrazilianPhone } from "./phone.schema";

describe("isValidBrazilianPhone", () => {
  it("aceita celular com nono dígito", () => {
    expect(isValidBrazilianPhone("11987654321")).toBe(true);
    expect(isValidBrazilianPhone("(11) 98765-4321")).toBe(true);
  });

  it("aceita fixo (10 dígitos)", () => {
    expect(isValidBrazilianPhone("1132654321")).toBe(true);
  });

  it("rejeita celular sem o nono dígito na posição certa", () => {
    expect(isValidBrazilianPhone("11887654321")).toBe(false);
  });

  it("rejeita DDD começando em 0 (fixo de 10 dígitos, sem prefixo de tronco)", () => {
    expect(isValidBrazilianPhone("0132654321")).toBe(false);
  });

  it("rejeita tamanho incorreto", () => {
    expect(isValidBrazilianPhone("123456")).toBe(false);
  });

  it("aceita celular/fixo com código do país (+55) na frente", () => {
    expect(isValidBrazilianPhone("+55 11 98765-4321")).toBe(true);
    expect(isValidBrazilianPhone("5511987654321")).toBe(true);
    expect(isValidBrazilianPhone("+55 (11) 3265-4321")).toBe(true);
    expect(isValidBrazilianPhone("551132654321")).toBe(true);
  });

  it("não confunde DDD 55 (Rio Grande do Sul) com código do país", () => {
    expect(isValidBrazilianPhone("55987654321")).toBe(true);
    expect(isValidBrazilianPhone("5532654321")).toBe(true);
  });

  it("rejeita número com código do país mas dígitos internos inválidos", () => {
    expect(isValidBrazilianPhone("+55 11 88765-4321")).toBe(false);
  });

  it("aceita prefixo de tronco '0' antes do DDD (formato antigo, ex. '(011) 98765-4321')", () => {
    expect(isValidBrazilianPhone("011991234567")).toBe(true);
    expect(isValidBrazilianPhone("(011) 98765-4321")).toBe(true);
    expect(isValidBrazilianPhone("01132654321")).toBe(true);
  });

  it("rejeita número com prefixo de tronco mas dígitos internos inválidos", () => {
    expect(isValidBrazilianPhone("011881234567")).toBe(false);
  });
});
