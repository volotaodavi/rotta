"use client";

import { ErrorState, Spinner } from "@rotta/ui/web";
import * as Sentry from "@sentry/nextjs";
import { useEffect, useState } from "react";

import { useChunkLoadRecovery } from "@/hooks/use-chunk-load-recovery";
import { readRecentRawClientError } from "@/lib/global-error-capture";
import { readLastCheckpoint } from "@/lib/render-checkpoint";
import { reportClientError } from "@/lib/report-client-error";
import { isServiceWorkerActive } from "@/lib/service-worker-status";

/**
 * Error Boundary do route group `(dashboard)` — pedido do usuário: "ao
 * criar uma rota... aparece que 'algo deu errado'". Sem isso, qualquer
 * exceção não tratada numa página do painel (`page.tsx` abaixo deste
 * layout) caía direto no `error.tsx` GLOBAL (`app/error.tsx`), que
 * substitui a árvore inteira — inclusive o cabeçalho/navegação de
 * `(dashboard)/layout.tsx` — deixando quem acabou de, por exemplo,
 * criar uma rota sem nenhum jeito de navegar pra outro lugar do painel
 * a não ser recarregar a página inteira.
 *
 * `layout.tsx` deste mesmo grupo continua renderizado ao redor deste
 * boundary (é o comportamento padrão do App Router: `error.tsx` só
 * substitui `children`, nunca o `layout.tsx` da mesma pasta) — o
 * usuário sempre mantém a navegação e consegue sair da tela quebrada
 * sem perder a sessão nem o resto do painel.
 *
 * `detail={error.message}` (pedido do usuário depois de ver esta MESMA
 * frase genérica várias vezes sem nenhuma pista do que quebrou): mostra
 * a mensagem curta do `Error` lançado, nunca a stack inteira — o
 * `console.error` abaixo continua sendo o lugar certo pra investigação
 * completa, isto aqui é só uma legenda visível na própria tela.
 *
 * `reportClientError` manda a mensagem/digest/stack REAIS pro nosso
 * próprio backend (`POST /client-errors`) antes que o Next.js as tenha
 * redigido em produção — ver `apps/web/src/lib/report-client-error.ts`.
 *
 * ACHADO REAL (depurando o "algo deu errado" que persistia mesmo depois
 * de deploys corretos): boa parte das ocorrências reais capturadas por
 * `reportClientError` eram `ChunkLoadError` — a aba do navegador ainda
 * com referências de chunk de um deploy ANTERIOR, tentando abrir uma
 * página nunca visitada antes na sessão (ex.: `/rotas/[id]` de uma rota
 * recém-criada) logo depois de um deploy novo trocar os arquivos
 * estáticos. `useChunkLoadRecovery` reconhece esse padrão e recarrega a
 * página sozinha — nunca chega a mostrar a tela de erro genérica pra
 * esse caso. Ver `@/lib/chunk-load-error.ts` pro "porquê" completo.
 *
 * ACHADO REAL (pedido explícito do usuário, fundador testando em
 * produção, depois de rodadas de fix que não bastaram sozinhas): boa
 * parte das ocorrências reais de "Server Components render" nunca passa
 * por um Error Boundary do React (Promise rejeitada sem `.catch()`,
 * erro assíncrono fora do render) — o Next mostra essa mesma tela
 * genérica REDIGIDA mesmo assim, sem stack nem digest de verdade.
 * `readRecentRawClientError()` (`@/lib/global-error-capture.ts`) lê o
 * registro do erro bruto ORIGINAL, capturado direto no navegador (nunca
 * redigido) — se ele for recente o bastante pra ser quase certo que é a
 * MESMA falha, mostramos o diagnóstico completo direto nesta tela, sem
 * precisar de nenhum dashboard externo.
 *
 * ACHADO REAL (reprodução ao vivo confirmada com o MESMO `deploymentId`
 * em cliente/assets/RSC — version skew descartado como causa desta
 * ocorrência específica): nem `readRecentRawClientError` (cobre
 * `window.onerror`/`unhandledrejection`) nem `SectionErrorBoundary`
 * (cobre exceção de render dentro da árvore que ele envolve) capturaram
 * nada nas ocorrências reais confirmadas — todas chegaram aqui com a
 * mensagem genérica do Next, nunca a real. `readLastCheckpoint()`
 * (`@/lib/render-checkpoint.ts`) é uma 3ª instrumentação, específica de
 * `/rotas/[id]` por enquanto: escreve um marcador síncrono a cada passo
 * do render dessa página — se a falha for de hidratação (um terceiro
 * caso que nem os dois mecanismos acima alcançam), o ÚLTIMO marcador
 * escrito antes da tela quebrar aparece aqui, apontando exatamente onde
 * o render parou.
 */
export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}): JSX.Element {
  const isRecovering = useChunkLoadRecovery(error);
  const [rawError, setRawError] = useState<ReturnType<typeof readRecentRawClientError>>();
  const [lastCheckpoint, setLastCheckpoint] = useState<ReturnType<typeof readLastCheckpoint>>();

  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error(error);
    // `Sentry.captureException` NÃO é automático aqui — precisa da
    // chamada manual (documentação oficial do Sentry pra Next.js App
    // Router). Sem isso o GlitchTip nunca recebia nada de verdade, só os
    // testes manuais enviados direto por `curl` — ver a nota completa em
    // `apps/web/src/app/error.tsx`.
    Sentry.captureException(error);
    const checkpoint = readLastCheckpoint();
    setLastCheckpoint(checkpoint);
    // Anexa o checkpoint ao relatório mandado pro backend (sem migration
    // nova — reaproveita o campo `stack`, já texto livre) — ver a nota
    // grande acima. `[checkpoint: ...]` fica sempre no INÍCIO da stack
    // pra aparecer mesmo se o resto for cortado em algum lugar.
    const reportedError = checkpoint
      ? Object.assign(new Error(error.message), {
          name: error.name,
          stack: `[checkpoint: ${checkpoint.label} @ ${new Date(checkpoint.at).toISOString()}]\n${error.stack ?? ""}`,
          digest: error.digest,
        })
      : error;
    reportClientError("WEB", reportedError, {
      source: "error-boundary",
      serviceWorkerActive: isServiceWorkerActive(),
    });
    setRawError(readRecentRawClientError());
  }, [error]);

  if (isRecovering) {
    return (
      <div className="flex justify-center py-16">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <ErrorState
        message="Não foi possível carregar esta página. Tente novamente ou use a navegação acima para ir a outro lugar do painel."
        detail={error.message || undefined}
        onRetry={reset}
      />
      {lastCheckpoint ? (
        <div className="mx-auto w-full max-w-2xl rounded-md border border-warning/30 bg-warning/5 p-4 text-left">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-warning">
            Último ponto do render antes da falha
          </p>
          <p className="whitespace-pre-wrap break-words font-mono text-xs text-text">
            {lastCheckpoint.label} · {lastCheckpoint.pathname} ·{" "}
            {new Date(lastCheckpoint.at).toLocaleTimeString("pt-BR")}
          </p>
        </div>
      ) : null}
      {rawError ? (
        <div className="mx-auto w-full max-w-2xl rounded-md border border-danger/30 bg-danger/5 p-4 text-left">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-danger">
            Diagnóstico técnico completo (capturado direto no navegador, sem redação)
          </p>
          <p className="mb-1 text-xs text-text-muted">
            Origem: {rawError.source} · {rawError.name ?? "Error"}
          </p>
          <p className="mb-2 whitespace-pre-wrap break-words font-mono text-xs text-text">
            {rawError.message}
          </p>
          {rawError.stack ? (
            <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-words rounded bg-black/5 p-2 font-mono text-[11px] text-text-muted">
              {rawError.stack}
            </pre>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
