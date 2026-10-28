import { FUNCIONALIDADES, ligada } from "../funcionalidades";

/**
 * Como uma variável de ambiente vira "área aberta".
 *
 * ## Por que o teste é da REGRA, e não do ambiente
 *
 * Porque `EXPO_PUBLIC_*` é substituído por TEXTO quando o bundle é
 * montado — é isso que faz a flag chegar ao celular. A consequência
 * para quem testa: trocar `process.env` em tempo de execução não muda
 * nada, nem com `jest.resetModules()`, porque o valor já virou
 * literal. Descobri isso tentando, e a tentativa está registrada aqui
 * para o próximo não repetir.
 *
 * Então o que se confere é a regra (`ligada`) e o estado em que o
 * repositório está hoje: tudo fechado, sem variável nenhuma.
 *
 * ## O que a regra tem de garantir
 *
 * **`"0"` e `"false"` são FECHADA.** Uma leitura ingênua
 * (`Boolean(valor)`) abriria a área com as duas — que é exatamente o
 * que alguém escreve querendo fechar. A lista do que liga é curta por
 * isso.
 */

describe("a regra de leitura", () => {
  it.each(["1", "true"])("%s abre", (valor) => {
    expect(ligada(valor)).toBe(true);
  });

  it.each(["0", "false", "no", "yes", "sim", "TRUE", "True", " 1", "1 ", ""])(
    "%s NÃO abre",
    (valor) => {
      expect(ligada(valor)).toBe(false);
    },
  );

  it("ausente não abre", () => {
    // É o caso mais importante: um build novo não pode abrir sozinho
    // uma área meio pronta.
    expect(ligada(undefined)).toBe(false);
  });
});

describe("o estado do repositório", () => {
  it("nenhuma área está aberta por padrão", () => {
    // `.env.example` deixa as duas variáveis como `""`, e nenhuma CI
    // as define. Se este teste começar a falhar, alguém abriu uma área
    // no ambiente de build — e aí é escolha, não acidente.
    expect(FUNCIONALIDADES).toEqual({ marketplace: false, rottaPay: false });
  });
});
