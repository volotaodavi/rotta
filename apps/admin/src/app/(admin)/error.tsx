"use client";

import { ErrorState, Spinner } from "@rotta/ui/web";
import { useEffect } from "react";

import { useChunkLoadRecovery } from "@/hooks/use-chunk-load-recovery";
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
 */
export default function AdminError({
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
      <div className="flex justify-center py-16">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <ErrorState
      message="Não foi possível carregar esta página. Tente novamente ou use a navegação acima para ir a outro lugar do painel."
      detail={error.message || undefined}
      onRetry={reset}
    />
  );
}
