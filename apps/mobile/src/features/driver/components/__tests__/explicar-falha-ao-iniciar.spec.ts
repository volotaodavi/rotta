import { ApiError, STATUS_TEMPO_ESGOTADO } from "@rotta/api-client";

import { explicarFalhaAoIniciar } from "../explicar-falha-ao-iniciar";

/**
 * O que o transportador lê quando "Verificar identidade agora" falha.
 *
 * Isto existe por um relato real (01/10/2026): o transportador tentava
 * verificar a identidade, o app dizia "tente novamente em instantes" —
 * e ele tentava, e tentava, e nunca funcionava, porque a causa era a
 * integração sem chave no ambiente. A frase não estava só vaga: estava
 * ERRADA sobre o que fazer, e por isso custou tempo de quem depende do
 * app para trabalhar.
 *
 * A regra que estes testes guardam é uma só: a mensagem só manda tentar
 * de novo quando tentar de novo pode mesmo resolver.
 */
function erroDaApi(status: number, message: string): ApiError {
  return new ApiError(status, { code: "ERRO", message });
}

describe("falha que o usuário resolve tentando de novo", () => {
  it("tempo esgotado manda tentar de novo — aí é verdade", () => {
    const texto = explicarFalhaAoIniciar(erroDaApi(STATUS_TEMPO_ESGOTADO, "timeout"));

    expect(texto).toMatch(/tente de novo/i);
  });

  it("falha sem resposta da API (rede caiu) fala de conexão", () => {
    const texto = explicarFalhaAoIniciar(new TypeError("Network request failed"));

    expect(texto).toMatch(/conex/i);
    expect(texto).toMatch(/tente de novo/i);
  });
});

describe("falha que tentar de novo NUNCA resolve", () => {
  it("integração indisponível (503) não manda tentar de novo", () => {
    // O caso do relato. Insistir aqui é o transportador perdendo o dia
    // por uma configuração que só a Rotta pode acertar.
    const texto = explicarFalhaAoIniciar(
      erroDaApi(503, "Didit não configurada neste ambiente (DIDIT_API_KEY ausente)."),
    );

    expect(texto).not.toMatch(/tente de novo/i);
    expect(texto).not.toMatch(/tente novamente/i);
  });

  it("503 diz que o problema é nosso, não da conta dele, e aponta o suporte", () => {
    // Sem isso a pessoa acha que errou alguma coisa, ou que a conta
    // dela tem defeito — e abre chamado pelo motivo errado.
    const texto = explicarFalhaAoIniciar(erroDaApi(503, "qualquer coisa"));

    expect(texto).toMatch(/não.*problema da sua conta/i);
    expect(texto).toMatch(/suporte/i);
  });
});

describe("o servidor sabe explicar melhor que uma frase fixa", () => {
  it("repassa a mensagem da API quando ela é específica", () => {
    // O backend escreve essas mensagens para serem lidas por quem usa
    // (mesmo padrão de `carteira-screen.tsx`). Trocá-las por uma frase
    // genérica é jogar fora a única informação útil que chegou.
    const texto = explicarFalhaAoIniciar(
      erroDaApi(400, "Este usuário já tem uma verificação em andamento."),
    );

    expect(texto).toBe("Este usuário já tem uma verificação em andamento.");
  });
});
