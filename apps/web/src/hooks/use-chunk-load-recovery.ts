"use client";

import { useEffect, useRef, useState } from "react";

import { isRecoverableStaleBundleError } from "@/lib/chunk-load-error";

const RELOAD_GUARD_KEY = "rotta_chunk_reload_state";
/** Janela em que tentativas consecutivas contam pro mesmo "episódio" —
 * passado isso sem nenhum novo erro, a próxima ocorrência começa a
 * contagem do zero (não é mais o mesmo incidente). Alargada de 20s pra
 * 30s junto da 3ª tentativa (abaixo) — com o atraso de `RELOAD_DELAY_MS`
 * antes de cada reload, um episódio de 3 tentativas já consome ~4.5s só
 * de atraso deliberado, sem contar o tempo de reload/render em si. */
const RELOAD_GUARD_WINDOW_MS = 30_000;
/**
 * Atraso antes de CADA reload (era imediato) — achado real na 2ª conta
 * de produção a reproduzir esta assinatura (`Davi Volotão`, build
 * `240d0b5...`, `/rotas/[id]` de uma rota criada segundos antes): as 3
 * tentativas dentro do mesmo episódio (reload imediato de cada vez)
 * falharam as 3, span de ~6s inteiro — ou seja, o reload imediato
 * reproduzia a MESMA corrida de cold start antes que ela tivesse tempo de
 * se resolver, gastando as tentativas do episódio sem dar nenhuma chance
 * real de pegar uma invocação diferente/já aquecida. Dar um respiro antes
 * de cada tentativa aumenta a chance de cair numa invocação que já
 * estabilizou, em vez de bater na mesma janela de corrida repetidamente.
 */
const RELOAD_DELAY_MS = 1_500;
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
 * streaming) reduziu a frequência mas não eliminou.
 *
 * 2ª OCORRÊNCIA REAL (conta `Davi Volotão`, build `240d0b5...`, ~5min
 * depois do deploy — a janela mais provável de propagação de CDN/lambda
 * ainda incompleta): as 2 tentativas já existentes (reload imediato)
 * esgotaram e o erro persistiu numa 3ª carga, E numa 4ª tentativa manual
 * quase 5 minutos depois (confirmado via `GET /client-errors` no Admin) —
 * prova concreta de que 2 tentativas SEM atraso não bastam pra esse
 * deploy específico. Confirmado depois, via `curl` na mesma URL exata,
 * que o problema se resolveu por conta própria (200 limpo) — o código da
 * página em si nunca teve bug: `identityVerification.status` desta conta
 * já estava `APROVADA` bem antes do erro (verificado no Admin), então o
 * bloqueio de identidade nem chegou a renderizar. Por isso agora tenta
 * até 3 vezes (era 2), cada uma com `RELOAD_DELAY_MS` de atraso (era
 * imediato) — dar tempo pra propagação/cold start se resolver entre
 * tentativas, não só multiplicar tentativas instantâneas que batem na
 * mesma corrida.
 */
const MAX_RELOAD_ATTEMPTS = 3;

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
    // Atraso deliberado (ver `RELOAD_DELAY_MS` acima) — reload imediato
    // reproduzia a mesma corrida de cold start/propagação antes que ela
    // tivesse tempo de se resolver.
    window.setTimeout(() => window.location.reload(), RELOAD_DELAY_MS);
  }, [error]);

  return isRecovering;
}
