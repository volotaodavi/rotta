"use client";

import { ErrorState } from "@rotta/ui/web";
import { useEffect } from "react";

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
 */
export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}): JSX.Element {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error(error);
  }, [error]);

  return (
    <ErrorState
      message="Não foi possível carregar esta página. Tente novamente ou use a navegação acima para ir a outro lugar do painel."
      onRetry={reset}
    />
  );
}
