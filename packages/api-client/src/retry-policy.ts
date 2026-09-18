import { ApiError, STATUS_TEMPO_ESGOTADO } from "./http";

/**
 * Política de retry compartilhada pelo `QueryClient` do web, do mobile e
 * do admin (pedido do usuário 17/09/2026, junto do rate limiting no
 * backend: "limite para o quesito de não quebrar + estourar o limite
 * gratuito").
 *
 * Antes disto os três apps usavam `retry: 3` seco, que repete QUALQUER
 * falha. Duas consequências ruins, e a segunda é a que importa aqui:
 *
 *  1. Erro 4xx não melhora repetindo. Um 403 de permissão ou um 404
 *     continuam 403 e 404 na quarta tentativa — as três repetições só
 *     atrasam a mensagem de erro chegar na tela.
 *  2. Repetir um 429 é o pior caso possível: o servidor acabou de dizer
 *     "pare", e o cliente responde com mais três requisições. Uma tela
 *     com 10 consultas abertas transforma um bloqueio em 40 chamadas.
 *     É exatamente o comportamento que faz o limite de plano gratuito
 *     estourar sozinho, sem ninguém atacando nada.
 *
 * O que continua repetindo: erro de rede (sem `status`, típico de
 * celular trocando de torre) e 5xx, que são falhas transitórias de
 * verdade. O 401 não passa por aqui — é tratado dentro do próprio
 * `http.ts`, que renova o token e refaz a chamada uma vez.
 */
export const MAX_TENTATIVAS_LEITURA = 3;

export function deveRepetirLeitura(tentativasFalhas: number, erro: unknown): boolean {
  const ehApiError = erro instanceof ApiError;

  // Tempo esgotado é a exceção entre os 4xx: ele não diz "seu pedido
  // está errado", diz "o servidor não respondeu a tempo" — que é
  // transitório por definição, e o caso mais comum é a API acordando de
  // um cold start. Repetir aqui é o que faz a segunda tentativa pegar a
  // API já de pé. Ver `TIMEOUT_PADRAO_MS` em `http.ts`.
  if (ehApiError && erro.status === STATUS_TEMPO_ESGOTADO) {
    return tentativasFalhas < MAX_TENTATIVAS_LEITURA;
  }

  if (ehApiError && erro.status >= 400 && erro.status < 500) {
    return false;
  }

  return tentativasFalhas < MAX_TENTATIVAS_LEITURA;
}
