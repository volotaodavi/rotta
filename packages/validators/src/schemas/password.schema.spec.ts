import { isStrongPassword, passwordEqualsIdentifier } from "./password.schema";

describe("isStrongPassword", () => {
  it("aceita senha com 8+ caracteres, letra e número", () => {
    expect(isStrongPassword("senha123")).toBe(true);
  });

  it("rejeita senha curta", () => {
    expect(isStrongPassword("abc123")).toBe(false);
  });

  it("rejeita senha somente numérica", () => {
    expect(isStrongPassword("12345678")).toBe(false);
  });

  it("rejeita senha somente alfabética", () => {
    expect(isStrongPassword("abcdefgh")).toBe(false);
  });
});

describe("passwordEqualsIdentifier", () => {
  it("detecta senha igual ao e-mail (case-insensitive)", () => {
    expect(passwordEqualsIdentifier("Fulano@Email.com", ["fulano@email.com", "11987654321"])).toBe(
      true,
    );
  });

  it("retorna falso quando a senha difere de todos os identificadores", () => {
    expect(passwordEqualsIdentifier("senha123", ["fulano@email.com", "11987654321"])).toBe(false);
  });

  it("ignora identificadores indefinidos", () => {
    expect(passwordEqualsIdentifier("senha123", [undefined, undefined])).toBe(false);
  });
});
