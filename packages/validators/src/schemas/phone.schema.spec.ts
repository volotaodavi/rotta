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

  it("rejeita DDD começando em 0", () => {
    expect(isValidBrazilianPhone("01987654321")).toBe(false);
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
});
