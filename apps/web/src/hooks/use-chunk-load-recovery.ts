"use client";

import { useEffect, useRef, useState } from "react";

import { isRecoverableStaleBundleError } from "@/lib/chunk-load-error";

const RELOAD_GUARD_KEY = "rotta_chunk_reload_state";
/** Janela em que tentativas consecutivas contam pro mesmo "episódio" —
 * passado isso sem nenhum novo erro, a próxima ocorrência começa a
 * contagem do zero (não é mais o mesmo incidente). */
const RELOAD_GUARD_WINDOW_MS = 20_000;
/**
 * ACHADO REAL (conta real em produção, 22 ocorrências confirmadas na tela
 * "Erros do cliente" do Admin Rotta — a mais recente já rodando o build
 * ATUAL, `serviceWorkerActive: false`, o que descarta "bundle antigo no
 * navegador" como explicação pra ESSA ocorrência específica): nem toda
 * ocorrência desta assinatura é bundle desatualizado. A investigação
 * ORIGINAL do mesmíssimo padrão (ver `fix(web): navegação forçada`, commit
 * `0c90857`) já tinha achado a mesma frase genérica com `digest` nulo
 * numa navegação client-side (`router.replace`) pra `/rotas/[id]` de uma
 * rota 100% nova — reproduzido no relato do usuário, nunca localmente
 * (`next dev`/`next build && next start`), e a mesma URL exata, buscada
 * de novo via `curl` segundos depois, sempre voltava limpa (200). Isso é
 * a assinatura de uma corrida intermitente de infraestrutura (cold start
 * da função serverless renderizando um segmento dinâmico NUNCA
 * renderizado antes), não de bundle obsoleto — mas o SINTOMA no
 * navegador é idêntico, e a mitigação é a mesma (uma nova requisição
 * geralmente cai numa invocação já aquecida). Trocar a navegação pra
 * `window.location.href` (navegação completa, não mais só RSC em
 * streaming) reduziu a frequência mas não eliminou — a ocorrência mais
 * recente prova que uma navegação completa cai na mesma corrida. Por
 * isso agora tenta até 2 vezes (era 1): uma corrida de cold start pode
 * perfeitamente falhar duas vezes seguidas antes de estabilizar.
 */
const MAX_RELOAD_ATTEMPTS = 2;

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
 * Recuperação automática de bundle desatualizado no navegador — cobre
 * tanto `ChunkLoadError` quanto a variante que o próprio Next.js absorve
 * e devolve como a mensagem genérica de "Server Components render" sem
 * `digest` (ver `isRecoverableStaleBundleError` em
 * `@/lib/chunk-load-error.ts` pro "porquê" completo de cada padrão, e a
 * nota grande acima sobre por que essa mesma assinatura também cobre uma
 * corrida intermitente de cold start, não só bundle obsoleto). Recarregar
 * a página inteira resolve nos dois casos — busca tudo de novo, sem
 * depender de nada obsoleto na aba nem esperar a mesma invocação fria.
 *
 * Retorna `true` enquanto está recarregando (pra a tela mostrar uma
 * mensagem neutra em vez do aviso de erro genérico, que nem chega a
 * fazer sentido pro usuário aqui).
 */
export function useChunkLoadRecovery(error: Error & { digest?: string }): boolean {
  const [isRecovering, setIsRecovering] = useState(false);
  // `setIsRecovering(true)` abaixo causa uma re-renderização — se o
  // chamador (o próprio `error.tsx`) recriar o objeto `error` nessa
  // re-renderização, o efeito rodaria de novo com uma dependência "nova"
  // e chamaria `window.location.reload()` uma segunda vez ANTES da
  // navegação de verdade sequer começar. Como só faz sentido disparar o
  // reload uma vez por instância montada deste hook (o resto do controle
  // — quantas tentativas no episódio, através de reloads de verdade — já
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
      // não é mais uma corrida pontual, deixa a tela normal de erro
      // aparecer (com o botão "Tentar novamente" manual).
      return;
    }

    hasAttemptedRef.current = true;
    window.sessionStorage.setItem(
      RELOAD_GUARD_KEY,
      JSON.stringify({ attempts: attemptsSoFar + 1, lastAttemptAt: now }),
    );
    setIsRecovering(true);
    window.location.reload();
  }, [error]);

  return isRecovering;
}
