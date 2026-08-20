"use client";

import { ErrorState } from "@rotta/ui/web";
import { useEffect } from "react";

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
 */
export default function DashboardError({
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
      detail={error.message || undefined}
      onRetry={reset}
    />
  );
}
