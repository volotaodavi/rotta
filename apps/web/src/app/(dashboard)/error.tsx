"use client";

import { ErrorState, Spinner } from "@rotta/ui/web";
import { useEffect } from "react";

import { useChunkLoadRecovery } from "@/hooks/use-chunk-load-recovery";
import { reportClientError } from "@/lib/report-client-error";

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
 */
export default function DashboardError({
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
    reportClientError("WEB", error);
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
