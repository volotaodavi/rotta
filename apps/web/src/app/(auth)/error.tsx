"use client";

import { ErrorState, Spinner } from "@rotta/ui/web";
import * as Sentry from "@sentry/nextjs";
import { useEffect, useState } from "react";

import { useChunkLoadRecovery } from "@/hooks/use-chunk-load-recovery";
import { readRecentRawClientError } from "@/lib/global-error-capture";
import { reportClientError } from "@/lib/report-client-error";
import { isServiceWorkerActive } from "@/lib/service-worker-status";

/**
 * Error Boundary do route group `(auth)` — mesmo motivo do
 * `(dashboard)/error.tsx`: sem um boundary local aqui, qualquer exceção
 * numa página de entrar/criar conta caía no `error.tsx` GLOBAL
 * (`app/error.tsx`), que substitui a árvore inteira — inclusive o
 * `layout.tsx` deste grupo (marca Rotta no topo, `RouteMark`) — deixando
 * quem estava criando conta sem nenhum jeito de voltar pra Landing Page
 * a não ser recarregar a aba inteira. `layout.tsx` continua renderizado
 * ao redor deste boundary (comportamento padrão do App Router: `error.tsx`
 * só substitui `children`, nunca o `layout.tsx` da mesma pasta).
 *
 * Mesma instrumentação do `(dashboard)/error.tsx` (`useChunkLoadRecovery`,
 * `readRecentRawClientError`, `reportClientError`) — ver a nota completa
 * lá pro "porquê" de cada uma.
 */
export default function AuthError({
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
    Sentry.captureException(error);
    reportClientError("WEB", error, {
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
    <div className="flex w-full max-w-sm flex-col gap-4">
      <ErrorState
        message="Não foi possível carregar esta página. Tente novamente ou volte pra página inicial."
        detail={error.message || undefined}
        onRetry={reset}
      />
      {rawError ? (
        <div className="w-full rounded-md border border-danger/30 bg-danger/5 p-4 text-left">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-danger">
            Diagnóstico técnico (capturado direto no navegador)
          </p>
          <p className="mb-1 text-xs text-text-muted">
            Origem: {rawError.source} · {rawError.name ?? "Error"}
          </p>
          <p className="whitespace-pre-wrap break-words font-mono text-xs text-text">
            {rawError.message}
          </p>
        </div>
      ) : null}
    </div>
  );
}
