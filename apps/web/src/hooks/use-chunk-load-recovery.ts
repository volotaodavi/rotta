"use client";

import { useEffect, useRef, useState } from "react";

import { isRecoverableStaleBundleError } from "@/lib/chunk-load-error";

const RELOAD_GUARD_KEY = "rotta_chunk_reload_state";
/** Janela em que uma nova ocorrência ainda conta como o mesmo "episódio"
 * — passado isso sem nenhum novo erro, a próxima ocorrência começa a
 * contagem do zero (não é mais o mesmo incidente). */
const RELOAD_GUARD_WINDOW_MS = 15_000;
/**
 * Atraso antes do reload (era imediato) — dá um respiro pra qualquer
 * condição transitória (deploy ainda propagando, invocação fria) ter
 * chance de se resolver antes da nova tentativa bater na mesma janela.
 */
const RELOAD_DELAY_MS = 1_500;
/**
 * NÃO é mais a defesa principal contra este padrão — ver `deploymentId`
 * em `next.config.mjs`, que ataca a causa mais provável (version skew:
 * o navegador já carregou o bundle de um deploy, mas a navegação
 * seguinte é respondida por outro deploy, e o payload RSC não bate com
 * os módulos que o cliente já tem). Este hook é só o último recurso pro
 * que ainda chegar até aqui — por isso UMA tentativa, não várias:
 * múltiplas recargas automáticas escondem um problema persistente atrás
 * de uma tela piscando, sem ajudar quem realmente não é transitório (ver
 * a 2ª ocorrência real abaixo, onde 2-3 tentativas não bastaram e o
 * ganho real só veio de atacar a causa, não de tentar mais vezes).
 *
 * HISTÓRICO (múltiplas ocorrências reais em produção da mesma
 * assinatura — "Server Components render" genérico, sem `digest`, quase
 * sempre segundos depois de abrir uma rota recém-criada em
 * `/rotas/[id]`, ver `@/lib/chunk-load-error.ts` pro detalhe de cada
 * padrão reconhecido):
 *
 * - 1ª investigação (commit `0c90857`): mesma frase, `digest` nulo, numa
 *   navegação client-side pra `/rotas/[id]` de uma rota 100% nova —
 *   nunca reproduzido localmente, e a mesma URL buscada de novo via
 *   `curl` segundos depois sempre voltava limpa (200). Trocar a
 *   navegação pra `window.location.href` reduziu a frequência, mas não
 *   eliminou.
 * - 2ª ocorrência (conta `Davi Volotão`, build `240d0b5...`, minutos
 *   depois desse deploy subir): 2 tentativas de reload imediato
 *   esgotaram sem resolver — 3 cargas seguidas falharam num intervalo de
 *   ~6s, e uma 4ª tentativa manual ~5min depois também falhou (visto via
 *   `GET /client-errors` no Admin). A mesma URL, testada via `curl`
 *   depois, voltou limpa (200) — e o status de verificação de identidade
 *   dessa conta já estava `APROVADA` durante todo o incidente (visto via
 *   `GET /identity-verification/admin/:userId`), o que descarta o
 *   próprio gate de identidade como causa visível pra esse caso
 *   específico.
 *
 * O que NÃO está comprovado, e não deve ser tratado como fato em nenhum
 * comentário deste arquivo: nem "é sempre bundle obsoleto no navegador",
 * nem "é sempre cold start de função serverless", nem "é sempre version
 * skew". A assinatura (mensagem genérica + `digest` ausente + acontece
 * ao navegar pra um segmento nunca renderizado antes) é compatível com
 * as três, e nenhuma delas foi confirmada por um stack trace real ou
 * pelos Runtime Logs da Vercel no horário exato — este projeto/sessão
 * não tem acesso a esses logs. Se um novo relato vier com `digest`
 * preenchido, ELE aponta pra uma exceção real do servidor — tratar como
 * bug de aplicação, correlacionar pelo digest, nunca presumir que é mais
 * uma ocorrência deste mesmo padrão de infraestrutura.
 */
const MAX_RELOAD_ATTEMPTS = 1;

interface ReloadGuardState {
  attempts: number;
  lastAttemptAt: number;
}

function readGuardState(): ReloadGuardState {
  try {
    const raw = window.sessionStorage.getItem(RELOAD_GUARD_KEY);
    if (!raw) return { attempts: 0, lastAttemptAt: 0 };
    const parsed = JSON.parse(raw) as Partial<ReloadGuardState>;
    return {
      attempts: typeof parsed.attempts === "number" ? parsed.attempts : 0,
      lastAttemptAt: typeof parsed.lastAttemptAt === "number" ? parsed.lastAttemptAt : 0,
    };
  } catch {
    return { attempts: 0, lastAttemptAt: 0 };
  }
}

/**
 * Recuperação automática de última linha para `ChunkLoadError` e para a
 * variante que o Next.js absorve como a mensagem genérica de "Server
 * Components render" sem `digest` (ver `isRecoverableStaleBundleError`
 * em `@/lib/chunk-load-error.ts`, e a nota grande acima sobre o que está
 * e o que NÃO está comprovado sobre a causa). A defesa estrutural contra
 * o padrão mais provável (version skew) é `deploymentId`
 * (`next.config.mjs`) — este hook só cobre o que ainda chegar até o
 * Error Boundary depois disso, com UMA tentativa (ver `MAX_RELOAD_ATTEMPTS`
 * acima pro porquê de não ser mais de uma).
 *
 * Retorna `true` enquanto está recarregando (pra a tela mostrar uma
 * mensagem neutra em vez do aviso de erro genérico, que nem chega a
 * fazer sentido pro usuário aqui). Se a única tentativa não resolver, o
 * chamador (`error.tsx`) mostra a tela normal de erro com o botão manual
 * "Tentar novamente".
 */
export function useChunkLoadRecovery(error: Error & { digest?: string }): boolean {
  const [isRecovering, setIsRecovering] = useState(false);
  // `setIsRecovering(true)` abaixo causa uma re-renderização — se o
  // chamador (o próprio `error.tsx`) recriar o objeto `error` nessa
  // re-renderização, o efeito rodaria de novo com uma dependência "nova"
  // e chamaria `window.location.reload()` uma segunda vez ANTES da
  // navegação de verdade sequer começar. Como só faz sentido disparar o
  // reload uma vez por instância montada deste hook (o resto do controle
  // — se este episódio já tentou, através de reloads de verdade — já
  // vive em `sessionStorage`), este `ref` é a trava real contra esse
  // efeito colateral, independente de quem chama.
  const hasAttemptedRef = useRef(false);

  useEffect(() => {
    if (!isRecoverableStaleBundleError(error)) return;
    if (typeof window === "undefined") return;
    if (hasAttemptedRef.current) return;

    const now = Date.now();
    const previous = readGuardState();
    const isSameEpisode = now - previous.lastAttemptAt < RELOAD_GUARD_WINDOW_MS;
    const attemptsSoFar = isSameEpisode ? previous.attempts : 0;

    if (attemptsSoFar >= MAX_RELOAD_ATTEMPTS) {
      // Já tentou o máximo de vezes neste episódio e o erro persiste —
      // não é mais uma condição transitória, deixa a tela normal de erro
      // aparecer (com o botão "Tentar novamente" manual).
      return;
    }

    hasAttemptedRef.current = true;
    window.sessionStorage.setItem(
      RELOAD_GUARD_KEY,
      JSON.stringify({ attempts: attemptsSoFar + 1, lastAttemptAt: now }),
    );
    setIsRecovering(true);
    // Atraso deliberado (ver `RELOAD_DELAY_MS` acima) — reload imediato
    // bate na mesma janela antes dela ter chance de se resolver.
    window.setTimeout(() => window.location.reload(), RELOAD_DELAY_MS);
  }, [error]);

  return isRecovering;
}
