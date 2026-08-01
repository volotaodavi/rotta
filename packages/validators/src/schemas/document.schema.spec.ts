import { isValidCNPJ, isValidCPF, isValidCpfOrCnpj } from "./document.schema";

/**
 * Gera um CPF/CNPJ válido a partir da base numérica, usando o próprio
 * algoritmo de dígito verificador — evita depender de números "mágicos"
 * memorizados (que podem estar errados) nos testes.
 */
function buildValidCpf(base9: string): string {
  const digit = (b: string): number => {
    let sum = 0;
    for (let i = 0; i < b.length; i += 1) sum += Number(b[i]) * (b.length + 1 - i);
    const rest = (sum * 10) % 11;
    return rest === 10 ? 0 : rest;
  };
  const d1 = digit(base9);
  const d2 = digit(base9 + String(d1));
  return `${base9}${d1}${d2}`;
}

function buildValidCnpj(base12: string): string {
  const digit = (b: string): number => {
    const weights =
      b.length === 12
        ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
        : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    let sum = 0;
    for (let i = 0; i < b.length; i += 1) sum += Number(b[i]) * (weights[i] ?? 0);
    const rest = sum % 11;
    return rest < 2 ? 0 : 11 - rest;
  };
  const d1 = digit(base12);
  const d2 = digit(base12 + String(d1));
  return `${base12}${d1}${d2}`;
}

describe("isValidCPF", () => {
  it("aceita um CPF com dígito verificador correto", () => {
    expect(isValidCPF(buildValidCpf("529982247"))).toBe(true);
  });

  it("aceita um CPF formatado com máscara", () => {
    const cpf = buildValidCpf("111444777");
    const formatted = `${cpf.slice(0, 3)}.${cpf.slice(3, 6)}.${cpf.slice(6, 9)}-${cpf.slice(9)}`;
    expect(isValidCPF(formatted)).toBe(true);
  });

  it("rejeita dígito verificador incorreto", () => {
    const valid = buildValidCpf("529982247");
    const tampered = `${valid.slice(0, 10)}${valid[10] === "0" ? "1" : "0"}`;
    expect(isValidCPF(tampered)).toBe(false);
  });

  it("rejeita sequência de dígitos repetidos", () => {
    expect(isValidCPF("111.111.111-11")).toBe(false);
  });

  it("rejeita tamanho incorreto", () => {
    expect(isValidCPF("123456")).toBe(false);
  });
});

describe("isValidCNPJ", () => {
  it("aceita um CNPJ com dígito verificador correto", () => {
    expect(isValidCNPJ(buildValidCnpj("112223330001"))).toBe(true);
  });

  it("rejeita dígito verificador incorreto", () => {
    const valid = buildValidCnpj("112223330001");
    const tampered = `${valid.slice(0, 13)}${valid[13] === "0" ? "1" : "0"}`;
    expect(isValidCNPJ(tampered)).toBe(false);
  });

  it("rejeita sequência de dígitos repetidos", () => {
    expect(isValidCNPJ("11.111.111/1111-11")).toBe(false);
  });
});

describe("isValidCpfOrCnpj", () => {
  it("aceita CPF (11 dígitos) e CNPJ (14 dígitos) pelo mesmo campo", () => {
    expect(isValidCpfOrCnpj(buildValidCpf("529982247"))).toBe(true);
    expect(isValidCpfOrCnpj(buildValidCnpj("112223330001"))).toBe(true);
  });
});
