"use client";

import { ErrorState, Spinner } from "@rotta/ui/web";
import * as Sentry from "@sentry/nextjs";
import { useEffect, useState } from "react";

import { useChunkLoadRecovery } from "@/hooks/use-chunk-load-recovery";
import { readRecentRawClientError } from "@/lib/global-error-capture";
import { reportClientError } from "@/lib/report-client-error";
import { isServiceWorkerActive } from "@/lib/service-worker-status";

/**
 * Error Boundary do route group `(marketing)` — mesmo motivo do
 * `(dashboard)/error.tsx`/`(auth)/error.tsx`: sem um boundary local
 * aqui, qualquer exceção numa página pública (Planos/Benefícios/FAQ/
 * Blog/etc.) caía no `error.tsx` GLOBAL, que substitui a árvore
 * inteira — inclusive o cabeçalho/rodapé de `(marketing)/layout.tsx` —
 * deixando um visitante sem nenhum jeito de navegar pro resto do site.
 * `layout.tsx` continua renderizado ao redor deste boundary
 * (comportamento padrão do App Router).
 *
 * Mesma instrumentação dos outros boundaries locais
 * (`useChunkLoadRecovery`, `readRecentRawClientError`,
 * `reportClientError`) — ver a nota completa em `(dashboard)/error.tsx`
 * pro "porquê" de cada uma.
 */
export default function MarketingError({
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
      <div className="flex justify-center py-24">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-6 py-24">
      <ErrorState
        message="Não foi possível carregar esta página. Tente novamente ou use o menu para ir a outro lugar do site."
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
