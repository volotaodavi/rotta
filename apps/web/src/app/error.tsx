"use client";

import { useEffect, useState } from "react";

import { useChunkLoadRecovery } from "@/hooks/use-chunk-load-recovery";
import { readRecentRawClientError } from "@/lib/global-error-capture";
import { reportClientError } from "@/lib/report-client-error";

/**
 * Error Boundary global do App Router (convencao de arquivo especial
 * `error.tsx` do Next.js) — captura qualquer erro nao tratado renderizado
 * abaixo dele. Segue o mesmo padrao estrutural de "tela de erro" do
 * Dossie 10, Secao 9.11 (icone + frase curta + acao), a implementar com
 * o Design System real quando `@rotta/ui` tiver componentes.
 *
 * `error.message` (curta, nunca a stack completa) aparece como legenda
 * discreta abaixo da frase principal — pedido do usuário depois de ver
 * repetidas vezes a mesma tela genérica sem nenhuma pista do que
 * quebrou. Integração com Sentry ainda a configurar (Dossie 23, Secao 9).
 *
 * `reportClientError` manda a mensagem/digest/stack REAIS pro nosso
 * próprio backend (`POST /client-errors`) — ver a nota completa em
 * `apps/web/src/lib/report-client-error.ts`. Isso existe porque em
 * produção o Next.js redige `error.message` antes de chegar aqui; sem
 * isso não há como saber o que quebrou de verdade sem vasculhar o
 * dashboard da Vercel manualmente.
 *
 * `useChunkLoadRecovery` cobre o caso real mais comum encontrado nessa
 * investigação: `ChunkLoadError` (aba com referências de chunk de um
 * deploy anterior) — recarrega a página sozinha em vez de mostrar essa
 * tela genérica pro usuário. Ver `@/lib/chunk-load-error.ts`.
 *
 * ACHADO REAL (pedido explícito do usuário, fundador testando em
 * produção): boa parte das ocorrências reais nunca passa por um Error
 * Boundary do React (Promise rejeitada sem `.catch()`, erro assíncrono
 * fora do render) — o Next mostra esta mesma tela genérica REDIGIDA
 * mesmo assim. `readRecentRawClientError()`
 * (`@/lib/global-error-capture.ts`) lê o registro do erro bruto
 * ORIGINAL, capturado direto no navegador — se for recente o bastante,
 * mostramos o diagnóstico completo aqui mesmo.
 */
export default function GlobalError({
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
    reportClientError("WEB", error);
    setRawError(readRecentRawClientError());
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
            <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-words rounded bg-black/5 p-2 text-left font-mono text-[11px] text-text-muted">
              {rawError.stack}
            </pre>
          ) : null}
        </div>
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
