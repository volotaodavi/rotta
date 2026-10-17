import { isValidBrazilianMobile, isValidBrazilianPhone, normalizarTelefone } from "./phone.schema";

describe("isValidBrazilianPhone", () => {
  it("aceita celular com nono dígito", () => {
    expect(isValidBrazilianPhone("11987654321")).toBe(true);
    expect(isValidBrazilianPhone("(11) 98765-4321")).toBe(true);
  });

  it("aceita fixo (10 dígitos)", () => {
    expect(isValidBrazilianPhone("1132654321")).toBe(true);
  });

  /**
   * ACHADO REAL (pedido do usuário — ver nota grande em `phone.schema.ts`):
   * a versão anterior recusava números reais só porque não batiam um
   * padrão rígido de DDD/nono dígito. Agora só a contagem de dígitos
   * importa — 10 ou 11 dígitos passam, independente do padrão interno.
   */
  it("aceita 11 dígitos mesmo sem o '9' na posição de celular (não recusa mais por formato)", () => {
    expect(isValidBrazilianPhone("11887654321")).toBe(true);
  });

  it("aceita DDD começando em 0 quando sobra exatamente 10/11 dígitos após normalizar", () => {
    // "0132654321" tem 10 dígitos e não começa com "0" duas vezes, então o
    // prefixo de tronco (só removido em 11/12 dígitos) não se aplica aqui —
    // passa direto pela contagem de dígitos, que é a única regra restante.
    expect(isValidBrazilianPhone("0132654321")).toBe(true);
  });

  it("rejeita tamanho incorreto", () => {
    expect(isValidBrazilianPhone("123456")).toBe(false);
    expect(isValidBrazilianPhone("123456789")).toBe(false);
    expect(isValidBrazilianPhone("123456789012")).toBe(false);
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

  it("aceita prefixo de tronco '0' antes do DDD (formato antigo, ex. '(011) 98765-4321')", () => {
    expect(isValidBrazilianPhone("011991234567")).toBe(true);
    expect(isValidBrazilianPhone("(011) 98765-4321")).toBe(true);
    expect(isValidBrazilianPhone("01132654321")).toBe(true);
  });

  it("rejeita string vazia ou só símbolos (nenhum dígito)", () => {
    expect(isValidBrazilianPhone("")).toBe(false);
    expect(isValidBrazilianPhone("()--")).toBe(false);
  });
});

describe("normalizarTelefone", () => {
  /**
   * Isto é o que estava faltando, e não era detalhe: o telefone é
   * LOGIN na Rotta, e era gravado exatamente como a pessoa digitava.
   * Quem cadastrava um responsável escrevendo a máscara gravava a
   * máscara; o login reduz o que foi digitado a dígitos e procura
   * outra string. A conta existia e não abria.
   */
  it("reduz a dígitos, tirando máscara, código do país e tronco", () => {
    expect(normalizarTelefone("(21) 99709-9557")).toBe("21997099557");
    expect(normalizarTelefone("+55 21 99709-9557")).toBe("21997099557");
    expect(normalizarTelefone("021 99709-9557")).toBe("21997099557");
    expect(normalizarTelefone("21997099557")).toBe("21997099557");
  });

  it("o mesmo número em quatro formatos vira a mesma chave", () => {
    const formatos = ["(21) 99709-9557", "+5521997099557", "021997099557", "21 99709 9557"];
    const chaves = new Set(formatos.map(normalizarTelefone));
    expect(chaves.size).toBe(1);
  });
});

describe("isValidBrazilianMobile", () => {
  it("aceita celular com DDD e nono dígito, em qualquer formato", () => {
    expect(isValidBrazilianMobile("21997099557")).toBe(true);
    expect(isValidBrazilianMobile("(21) 99709-9557")).toBe(true);
    expect(isValidBrazilianMobile("+55 21 99709-9557")).toBe(true);
  });

  it("recusa fixo: dez dígitos não recebem mensagem", () => {
    expect(isValidBrazilianMobile("1132654321")).toBe(false);
  });

  it("recusa dígito a mais, dígito a menos e DDD esquecido", () => {
    expect(isValidBrazilianMobile("2199709955")).toBe(false);
    expect(isValidBrazilianMobile("219970995577")).toBe(false);
    expect(isValidBrazilianMobile("997099557")).toBe(false);
  });

  it("recusa o que não começa em 9 depois do DDD", () => {
    /* O nono dígito é obrigatório em todo o país desde 2016. */
    expect(isValidBrazilianMobile("21887654321")).toBe(false);
  });

  it("recusa DDD que não existe", () => {
    expect(isValidBrazilianMobile("01997099557")).toBe(false);
    expect(isValidBrazilianMobile("10997099557")).toBe(false);
  });
});
