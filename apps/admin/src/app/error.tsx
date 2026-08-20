"use client";

import { useEffect } from "react";

import { useChunkLoadRecovery } from "@/hooks/use-chunk-load-recovery";
import { reportClientError } from "@/lib/report-client-error";

/**
 * Error Boundary global do App Router (convencao de arquivo especial
 * `error.tsx` do Next.js) — captura qualquer erro nao tratado renderizado
 * abaixo dele. Segue o mesmo padrao estrutural de "tela de erro" do
 * Dossie 10, Secao 9.11 (icone + frase curta + acao), a implementar com
 * o Design System real quando `@rotta/ui` tiver componentes.
 *
 * `error.message` (curta, nunca a stack completa) aparece como legenda
 * discreta abaixo da frase principal — mesmo pedido do usuário
 * atendido em `apps/web/src/app/error.tsx`. Integração com Sentry
 * ainda a configurar (Dossie 23, Secao 9).
 *
 * `reportClientError` manda a mensagem/digest/stack REAIS pro nosso
 * próprio backend (`POST /client-errors`) — ver
 * `apps/admin/src/lib/report-client-error.ts`.
 *
 * `useChunkLoadRecovery` cobre o caso real mais comum encontrado
 * depurando esse fluxo (`ChunkLoadError` — aba com referências de chunk
 * de um deploy anterior): recarrega a página sozinha em vez de mostrar
 * essa tela genérica. Ver `@/lib/chunk-load-error.ts`.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}): JSX.Element {
  const isRecovering = useChunkLoadRecovery(error);

  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error(error);
    reportClientError("ADMIN", error);
  }, [error]);

  if (isRecovering) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background px-6 text-center text-text">
        <p className="text-text-muted">Atualizando a página...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-6 text-center text-text">
      <h1 className="text-h1 font-semibold">Algo deu errado</h1>
      <p className="text-text-muted">Ocorreu um erro inesperado. Tente novamente em instantes.</p>
      {error.message ? (
        <p className="max-w-md break-words text-xs text-text-muted">{error.message}</p>
      ) : null}
      <button
        type="button"
        onClick={reset}
        className="rounded-md bg-primary px-4 py-2 font-semibold text-white hover:bg-primary-hover"
      >
        Tentar novamente
      </button>
    </div>
  );
}
