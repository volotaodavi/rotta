"use client";

import { ErrorState, Spinner } from "@rotta/ui/web";
import { useEffect, useState } from "react";

import { useChunkLoadRecovery } from "@/hooks/use-chunk-load-recovery";
import { readRecentRawClientError } from "@/lib/global-error-capture";
import { reportClientError } from "@/lib/report-client-error";

/**
 * Error Boundary do route group `(admin)` — mesma correção de
 * `apps/web` (pedido do usuário: "aparece que 'algo deu errado'"): sem
 * isso, qualquer exceção não tratada numa página do Admin Rotta caía
 * direto no `error.tsx` GLOBAL (`app/error.tsx`), que substitui a
 * árvore inteira — inclusive a navegação de `(admin)/layout.tsx` —
 * deixando quem estava numa tela quebrada sem jeito de ir a outro
 * lugar do painel a não ser recarregar a página inteira.
 *
 * `layout.tsx` deste mesmo grupo continua renderizado ao redor deste
 * boundary (comportamento padrão do App Router: `error.tsx` só
 * substitui `children`, nunca o `layout.tsx` da mesma pasta).
 *
 * `reportClientError` manda a mensagem/digest/stack REAIS pro nosso
 * próprio backend (`POST /client-errors`) antes que o Next.js as tenha
 * redigido em produção — ver `apps/admin/src/lib/report-client-error.ts`.
 *
 * `useChunkLoadRecovery` cobre o caso real mais comum encontrado
 * depurando esse fluxo (`ChunkLoadError` — aba com referências de chunk
 * de um deploy anterior, tentando abrir uma página nunca visitada antes
 * na sessão): recarrega a página sozinha em vez de mostrar essa tela
 * genérica. Ver `@/lib/chunk-load-error.ts`.
 *
 * ACHADO REAL (investigação do mesmo "algo deu errado" confirmada
 * acontecendo também aqui no Admin — não só em `apps/web`): boa parte
 * das ocorrências reais nunca passa por um Error Boundary do React
 * (Promise rejeitada sem `.catch()`, erro assíncrono fora do render) —
 * o Next mostra esta mesma tela genérica REDIGIDA mesmo assim.
 * `readRecentRawClientError()` (`@/lib/global-error-capture.ts`) lê o
 * registro do erro bruto ORIGINAL, capturado direto no navegador — se
 * for recente o bastante, mostramos o diagnóstico completo aqui mesmo.
 */
export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}): JSX.Element {
  const isRecovering = useChunkLoadRecovery(error);
  const [rawError, setRawError] = useState<ReturnType<typeof readRecentRawClientError>>();

  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error(error);
    reportClientError("ADMIN", error);
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
