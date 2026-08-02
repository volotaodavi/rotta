import { isValidPlate, normalizePlate } from "./plate.schema";

describe("normalizePlate", () => {
  it("remove separadores e converte para maiúsculas", () => {
    expect(normalizePlate("abc-1234")).toBe("ABC1234");
    expect(normalizePlate("ABC 1D23")).toBe("ABC1D23");
  });
});

describe("isValidPlate", () => {
  it("aceita o formato antigo (3 letras + 4 dígitos)", () => {
    expect(isValidPlate("ABC1234")).toBe(true);
    expect(isValidPlate("abc-1234")).toBe(true);
  });

  it("aceita o padrão Mercosul (3 letras + dígito + letra + 2 dígitos)", () => {
    expect(isValidPlate("ABC1D23")).toBe(true);
    expect(isValidPlate("abc 1d23")).toBe(true);
  });

  it("rejeita formatos inválidos", () => {
    expect(isValidPlate("AB1234")).toBe(false);
    expect(isValidPlate("ABCD123")).toBe(false);
    expect(isValidPlate("1234ABC")).toBe(false);
    expect(isValidPlate("")).toBe(false);
  });
});
