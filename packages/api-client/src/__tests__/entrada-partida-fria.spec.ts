import { describe, expect, it, vi } from "vitest";

import { createAuthEndpoints } from "../endpoints/auth";
import { TIMEOUT_PADRAO_MS, TIMEOUT_PARTIDA_FRIA_MS } from "../http";

import type { ApiClient } from "../http";

/**
 * "Erro inesperado ao entrar" — 13/10/2026.
 *
 * ## O defeito
 *
 * O fundador tentou entrar no app e recebeu "Erro inesperado ao
 * entrar". O banco prova que o SERVIDOR aceitou: `tentativasLoginFalhas`
 * estava em 0 (o contador sobe a cada senha errada e só é zerado numa
 * entrada bem-sucedida) e a linha do usuário tinha sido atualizada no
 * horário da tentativa. Ou seja, a senha estava certa, o servidor
 * processou, e o aplicativo não recebeu a resposta.
 *
 * A mensagem genérica confirma: a tela só a usa quando o erro NÃO é um
 * `ApiError`. Credencial errada devolve 401 com texto próprio; o que
 * sobra é requisição abortada por tempo.
 *
 * A causa é a mesma aritmética de 06/10/2026, deixada pela metade. A
 * API dorme no plano gratuito do Render e leva perto de 90 segundos
 * para acordar. Naquele dia o teto de `refresh` subiu para 120s, e o
 * comentário escrito ali dizia, com todas as letras, que "o login
 * falhava igual" — mas o `login` continuou com o teto padrão de 60s.
 * Sessenta é menor que noventa, e a pessoa que abre o app deslogada
 * digita e-mail e senha em vinte segundos: a requisição de login cai
 * exatamente dentro da partida fria.
 *
 * ## Por que o teste olha a opção e não simula uma requisição lenta
 *
 * Porque o defeito É a opção ausente. Simular lentidão provaria que o
 * `AbortController` funciona, o que já era verdade e nunca foi o
 * problema. O que precisa ficar travado é que toda porta de ENTRADA do
 * app peça o teto da partida fria, já que qualquer uma delas pode ser a
 * primeira requisição depois de o servidor dormir.
 */

/** Registra as opções de cada chamada, sem fazer requisição nenhuma. */
function clienteEspiao() {
  const chamadas: { caminho: string; opcoes?: { timeoutMs?: number } }[] = [];
  const request = vi.fn(async (caminho: string, opcoes?: { timeoutMs?: number }) => {
    chamadas.push({ caminho, opcoes });
    return { data: {} };
  });
  return { chamadas, apiClient: { request } as unknown as ApiClient };
}

/**
 * As portas de entrada: tudo que uma pessoa pode acionar na PRIMEIRA
 * tela depois de abrir o app, quando o servidor ainda pode estar
 * dormindo. Cada uma recebe o teto da partida fria.
 */
const PORTAS_DE_ENTRADA: {
  nome: string;
  caminho: string;
  chamar: (api: ReturnType<typeof createAuthEndpoints>) => Promise<unknown>;
}[] = [
  {
    nome: "login",
    caminho: "/auth/login",
    chamar: (api) => api.login({ identificador: "a@b.c", senha: "x" }),
  },
  {
    nome: "refresh",
    caminho: "/auth/refresh",
    chamar: (api) => api.refresh("token"),
  },
];

describe("portas de entrada contra a partida fria do plano gratuito", () => {
  /** Medido em 03/09/2026 contra a API de produção. */
  const COLD_START_MEDIDO_MS = 89_000;

  it.each(PORTAS_DE_ENTRADA)("$nome pede o teto da partida fria", async ({ caminho, chamar }) => {
    const { chamadas, apiClient } = clienteEspiao();

    await chamar(createAuthEndpoints(apiClient));

    const chamada = chamadas.find((c) => c.caminho === caminho);
    expect(chamada).toBeDefined();
    expect(chamada?.opcoes?.timeoutMs).toBe(TIMEOUT_PARTIDA_FRIA_MS);
  });

  it("o teto da partida fria cobre o cold start medido", () => {
    /*
      Repetido de `partida-fria.spec.ts` de propósito: aqui ele é a
      premissa do teste acima. Se alguém baixar a constante, este
      arquivo passa a mentir sem falhar.
    */
    expect(TIMEOUT_PARTIDA_FRIA_MS).toBeGreaterThan(COLD_START_MEDIDO_MS);
    expect(TIMEOUT_PADRAO_MS).toBeLessThan(COLD_START_MEDIDO_MS);
  });
});
